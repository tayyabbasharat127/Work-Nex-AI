const fs = require('fs');
const path = require('path');
const axios = require('axios');
const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/dateHelpers');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const { aiServiceHeaders } = require('../../utils/aiServiceAuth');
const AI_TIMEOUT_MS  = 12000;

const DATA_DIR = path.join(process.cwd(), 'storage', 'leave-automation');
const DOC_DIR = path.join(DATA_DIR, 'documents');

const ensureDocumentStorage = () => {
  fs.mkdirSync(DOC_DIR, { recursive: true });
};

const normalizeLeaveType = (value = '') => value.toUpperCase().replace(/[^A-Z_]/g, '_');

// Default label when an org hasn't set a custom displayName for a leave type —
// matches what every page already showed before displayName existed.
const titleCaseLeaveType = (type = '') => type.charAt(0) + type.slice(1).toLowerCase();

const assertDocumentAccess = (doc, user) => {
  if (user.role !== 'SUPER_ADMIN' && doc.organizationId !== user.organizationId) {
    throw new ApiError(403, 'Not authorized for this organization');
  }
};

const findDocument = async (documentId, user) => {
  const doc = await prisma.policyDocument.findUnique({
    where: { id: documentId },
    include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
  });
  if (!doc) throw new ApiError(404, 'Policy document not found');
  assertDocumentAccess(doc, user);
  return doc;
};

const safeRequire = (pkg) => {
  try {
    return require(pkg);
  } catch {
    return null;
  }
};

const extractText = async (doc) => {
  if (!doc.filePath || !fs.existsSync(doc.filePath)) throw new ApiError(404, 'Policy document file not found');
  const ext = path.extname(doc.fileName).toLowerCase();
  const buffer = fs.readFileSync(doc.filePath);

  if (ext === '.txt') return buffer.toString('utf8');

  if (ext === '.docx') {
    const mammoth = safeRequire('mammoth');
    if (!mammoth) return '[DOCX extraction unavailable: install mammoth to parse this file type.]';
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (ext === '.pdf') {
    const pdfParse = safeRequire('pdf-parse');
    if (!pdfParse) return '[PDF extraction unavailable: install pdf-parse to parse this file type.]';
    const result = await pdfParse(buffer);
    return result.text || '';
  }

  throw new ApiError(400, 'Unsupported policy document type');
};

const parseNumberNear = (text, regex, fallback = null) => {
  const match = text.match(regex);
  return match ? parseInt(match[1], 10) : fallback;
};

const parseRoles = (text) => {
  const roles = [];
  for (const role of ['EMPLOYEE', 'MANAGER', 'ADMIN', 'SUPER_ADMIN']) {
    if (new RegExp(role.replace('_', '[- ]?'), 'i').test(text)) roles.push(role);
  }
  return roles.length ? roles : ['EMPLOYEE', 'MANAGER', 'ADMIN'];
};

const deterministicParse = (text) => {
  const upper = text.toUpperCase();
  const knownTypes = ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'BEREAVEMENT', 'MARRIAGE', 'STUDY', 'HAJJ', 'COMPENSATORY', 'OTHER'];
  const found = knownTypes.filter((type) => upper.includes(type));
  const types = found.length ? found : ['ANNUAL'];
  // Blank-line-delimited paragraphs — each leave-type section is one paragraph
  // in the expected document format ("CASUAL LEAVE\n...\n\nANNUAL LEAVE\n...").
  const paragraphs = text.split(/\n\s*\n/);

  return {
    parser: process.env.OPENAI_API_KEY ? 'deterministic-fallback-no-llm-call' : 'deterministic-fallback',
    confidence: found.length ? 0.72 : 0.42,
    leavePolicies: types.map((leaveType) => {
      const lowerType = leaveType.toLowerCase();
      // Anchor on the section heading ("CASUAL LEAVE", "ANNUAL LEAVE", ...) and use only
      // that paragraph — every section's quota line reads "Annual quota: N days", so a
      // bare `${leaveType}` substring search on "ANNUAL" would false-positive inside
      // CASUAL's own "Annual quota:" line and grab the wrong section's numbers.
      const headingRegex = new RegExp(`^\\s*${leaveType}\\s+LEAVE\\b`, 'i');
      const headingParagraph = paragraphs.find((p) => headingRegex.test(p));
      const window = headingParagraph || text.match(new RegExp(`.{0,120}${leaveType}.{0,240}`, 'is'))?.[0] || text;
      return {
        leaveType,
        // Anchor on "quota" / "per year" specifically — real-world documents often
        // mention a monthly figure too ("Monthly per: 1 day"), and a bare
        // `(\d+)\s*days?` search would grab that number instead of the actual
        // yearly quota if it happens to appear first in the paragraph.
        annualQuota: parseNumberNear(window, /(?:annual\s*)?quota[:\s]*(\d+)\s*days?/i, null)
          ?? parseNumberNear(window, /(\d+)\s*days?\s*per\s*year/i, null)
          ?? parseNumberNear(window, /(\d+)\s*(?:days?|annual quota|per year)/i, leaveType === 'ANNUAL' ? 18 : null),
        maxConsecutiveDays: parseNumberNear(window, /max(?:imum)?\s*(?:consecutive)?\s*(\d+)\s*days?/i, null),
        minNoticeDays: parseNumberNear(window, /(?:notice|min(?:imum)? notice).*?(\d+)\s*days?/i, lowerType === 'annual' ? 7 : null),
        applicableRoles: parseRoles(window),
        carryForwardAllowed: /carry\s*forward/i.test(window) && !/no\s+carry\s*forward/i.test(window),
        maxCarryForwardDays: parseNumberNear(window, /carry\s*forward.*?(\d+)\s*days?/i, 0),
        ...(() => {
          const hasAutoApprovePhrase = /auto[- ]?approve/i.test(window);
          const autoApproveMaxDays = hasAutoApprovePhrase
            ? parseNumberNear(window, /up to\s*(\d+)\s*(?:consecutive\s*)?days?/i, null)
            : null;
          // A day-limited auto-approve ("up to 1 day") is a conditional exception —
          // manager approval still applies beyond that limit, so requiresManagerApproval
          // stays true and the decision engine grants the exception itself via
          // autoApproveMaxDays. Only an unqualified "auto-approve" (no day limit found)
          // turns manager approval off for the whole leave type.
          return {
            requiresManagerApproval: !(hasAutoApprovePhrase && autoApproveMaxDays == null),
            autoApproveMaxDays,
          };
        })(),
        requiresAdminApproval: /admin approval|hr approval|human resources approval/i.test(window),
        requiresMedicalCertificateAfterDays: leaveType === 'SICK'
          ? parseNumberNear(window, /medical certificate.*?(\d+)\s*days?/i, 2)
          : null,
        probationAllowed: !/probation.*not allowed|not allowed.*probation/i.test(window),
        maxConcurrentLeavePercent: parseNumberNear(
          window,
          /(?:no more than|maximum|up to)\s*(\d+)\s*%\s*(?:of\s*(?:the\s*)?)?(?:team|department|staff)/i,
          null,
        ),
      };
    }),
  };
};

const validateParsedRules = (parsed) => {
  if (!parsed || !Array.isArray(parsed.leavePolicies)) {
    throw new ApiError(400, 'Parsed policy rules must include leavePolicies array');
  }
  return {
    parser: parsed.parser || 'unknown',
    confidence: Number(parsed.confidence || 0),
    leavePolicies: parsed.leavePolicies.map((rule) => ({
      leaveType: normalizeLeaveType(rule.leaveType || 'OTHER'),
      displayName: rule.displayName && String(rule.displayName).trim() ? String(rule.displayName).trim() : null,
      annualQuota: rule.annualQuota === null || rule.annualQuota === undefined ? null : Number(rule.annualQuota),
      maxConsecutiveDays: rule.maxConsecutiveDays === null || rule.maxConsecutiveDays === undefined ? null : Number(rule.maxConsecutiveDays),
      minNoticeDays: rule.minNoticeDays === null || rule.minNoticeDays === undefined ? null : Number(rule.minNoticeDays),
      applicableRoles: Array.isArray(rule.applicableRoles) && rule.applicableRoles.length ? rule.applicableRoles : ['EMPLOYEE'],
      carryForwardAllowed: Boolean(rule.carryForwardAllowed),
      maxCarryForwardDays: Number(rule.maxCarryForwardDays || 0),
      requiresManagerApproval: rule.requiresManagerApproval !== false,
      autoApproveMaxDays: rule.autoApproveMaxDays === null || rule.autoApproveMaxDays === undefined ? null : Number(rule.autoApproveMaxDays),
      requiresAdminApproval: Boolean(rule.requiresAdminApproval),
      requiresMedicalCertificateAfterDays: rule.requiresMedicalCertificateAfterDays === null || rule.requiresMedicalCertificateAfterDays === undefined
        ? null
        : Number(rule.requiresMedicalCertificateAfterDays),
      probationAllowed: rule.probationAllowed !== false,
      maxConcurrentLeavePercent: rule.maxConcurrentLeavePercent === null || rule.maxConcurrentLeavePercent === undefined
        ? null
        : Number(rule.maxConcurrentLeavePercent),
    })),
  };
};

const parsedRulesFromRecords = (records = []) => {
  if (!records.length) return null;
  return {
    parser: 'database',
    confidence: records.reduce((sum, item) => sum + Number(item.confidenceScore || 0), 0) / records.length,
    leavePolicies: records.map((item) => item.extractedJson),
  };
};

const serializeDocument = (doc) => {
  const latestVersion = doc.policyVersions?.[0] || null;
  const parsedRules = parsedRulesFromRecords(doc.extractedRules);
  const approvedRules = latestVersion?.status === 'ACTIVE' ? latestVersion.rulesJson : null;
  const status = latestVersion?.status === 'ACTIVE'
    ? 'APPROVED_RULES_ACTIVE'
    : doc.status === 'PARSED'
      ? 'PARSED_REQUIRES_ADMIN_APPROVAL'
      : doc.status;

  return {
    id: doc.id,
    organizationId: doc.organizationId,
    originalName: doc.fileName,
    fileName: doc.fileName,
    fileType: doc.fileType,
    path: doc.filePath,
    status,
    extractedText: doc.extractedText,
    parsedRules,
    approvedRules,
    approvedAt: latestVersion?.approvedAt || null,
    approvedBy: latestVersion?.approvedById || null,
    policyVersionId: latestVersion?.id || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

const uploadPolicyDocument = async (file, user) => {
  if (!file) throw new ApiError(400, 'Policy document file is required');
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.txt', '.pdf', '.docx'].includes(ext)) {
    throw new ApiError(400, 'Only .txt, .pdf, and .docx policy documents are supported');
  }
  ensureDocumentStorage();
  const documentId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const destination = path.join(DOC_DIR, `${documentId}${ext}`);
  fs.copyFileSync(file.path, destination);
  fs.unlinkSync(file.path);

  const doc = await prisma.policyDocument.create({
    data: {
      id: documentId,
      organizationId: user.organizationId,
      uploadedById: user.id,
      fileName: file.originalname,
      fileType: ext.slice(1),
      filePath: destination,
      status: 'UPLOADED',
    },
    include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
  });
  return serializeDocument(doc);
};

const extractPolicyDocument = async (documentId, user) => {
  const doc = await findDocument(documentId, user);
  const extractedText = await extractText(doc);
  const updated = await prisma.policyDocument.update({
    where: { id: doc.id },
    data: { extractedText, status: 'EXTRACTED' },
    include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
  });
  return serializeDocument(updated);
};

const aiParsePolicyDocument = async (documentId, user) => {
  const doc = await findDocument(documentId, user);
  const extractedText = doc.extractedText || await extractText(doc);

  // Attempt AI service LLM extraction (Groq/OpenAI); fall back to deterministic
  let parsedRules;
  if (process.env.AI_SERVICE_URL || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      const resp = await axios.post(
        `${AI_SERVICE_URL}/predict/leave-policy`,
        { text: extractedText },
        { headers: aiServiceHeaders(doc.organizationId), timeout: AI_TIMEOUT_MS },
      );
      const aiResult = resp.data;
      if (aiResult?.leavePolicies?.length) {
        // Boost confidence when AI succeeds
        aiResult.confidence = Math.min(1, (Number(aiResult.confidence) || 0.8) + 0.05);
        aiResult.parser = aiResult.parser || 'ai-llm';
        parsedRules = validateParsedRules(aiResult);
      }
    } catch {
      // AI service unavailable — fall through to deterministic
    }
  }
  if (!parsedRules) {
    parsedRules = validateParsedRules(deterministicParse(extractedText));
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.extractedPolicyRule.deleteMany({ where: { policyDocumentId: doc.id, status: 'DRAFT' } });
    for (const rule of parsedRules.leavePolicies) {
      await tx.extractedPolicyRule.create({
        data: {
          organizationId: doc.organizationId,
          policyDocumentId: doc.id,
          leaveType: rule.leaveType,
          extractedJson: rule,
          confidenceScore: parsedRules.confidence,
          status: 'DRAFT',
        },
      });
    }
    return tx.policyDocument.update({
      where: { id: doc.id },
      data: { extractedText, status: 'PARSED' },
      include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
    });
  });

  return serializeDocument(updated);
};

// The legacy LeavePolicy table is still what LeaveBalance rows key against
// (a hard FK — LeaveBalance.policyId -> LeavePolicy.id), so it can't simply
// be replaced by LeavePolicyVersion. Instead, every time a new rules version
// goes ACTIVE, sync LeavePolicy's totals/carry-forward/roles to match — so
// anything that still reads LeavePolicy (new-user balance provisioning, the
// annual carry-forward reset job) sees the real configured numbers instead
// of stale defaults from org registration. Existing rows for leave types no
// longer in the active policy are left alone (not deleted — employees may
// already have LeaveBalance rows against them), just no longer picked up by
// new-user provisioning (see users.service.js createUser).
const syncLegacyLeavePolicies = async (tx, organizationId, leavePolicies) => {
  const roles = await tx.role.findMany({ where: { organizationId }, select: { id: true, tier: true } });
  const roleIdByTier = Object.fromEntries(roles.map((r) => [r.tier, r.id]));

  for (const rule of leavePolicies) {
    const applicableRoleIds = (rule.applicableRoles || [])
      .map((tier) => roleIdByTier[tier])
      .filter(Boolean);
    const description = rule.displayName ? `${rule.displayName} — synced from active leave policy` : undefined;
    await tx.leavePolicy.upsert({
      where: { organizationId_leaveType: { organizationId, leaveType: rule.leaveType } },
      update: {
        totalDays: rule.annualQuota ?? 0,
        carryForward: rule.carryForwardAllowed,
        maxCarryForward: rule.maxCarryForwardDays,
        applicableRoleIds,
        ...(description ? { description } : {}),
      },
      create: {
        organizationId,
        leaveType: rule.leaveType,
        totalDays: rule.annualQuota ?? 0,
        carryForward: rule.carryForwardAllowed,
        maxCarryForward: rule.maxCarryForwardDays,
        applicableRoleIds,
        description: description || null,
      },
    });
  }
};

// Shared by both the document-upload approval path and manual policy entry —
// archives the current ACTIVE version and activates a new one. `documentId` is
// null for manually-entered rules (LeavePolicyVersion.policyDocumentId is optional).
const activateRulesVersion = async (organizationId, approvedRules, user, documentId, tx) => {
  const latest = await tx.leavePolicyVersion.findFirst({
    where: { organizationId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  await tx.leavePolicyVersion.updateMany({
    where: { organizationId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED', effectiveTo: new Date() },
  });
  const version = await tx.leavePolicyVersion.create({
    data: {
      organizationId,
      policyDocumentId: documentId || null,
      version: (latest?.version || 0) + 1,
      status: 'ACTIVE',
      effectiveFrom: new Date(),
      rulesJson: approvedRules,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });
  await tx.auditLog.create({
    data: {
      organizationId,
      userId: user.id,
      action: 'APPROVE',
      entity: documentId ? 'LeavePolicyDocument' : 'LeavePolicyVersion',
      entityId: documentId || version.id,
      newValues: approvedRules,
    },
  });
  await syncLegacyLeavePolicies(tx, organizationId, approvedRules.leavePolicies);
  return version;
};

const approvePolicyRules = async (documentId, rules, user) => {
  const doc = await findDocument(documentId, user);
  const sourceRules = rules?.leavePolicies ? rules : parsedRulesFromRecords(doc.extractedRules);
  const approvedRules = validateParsedRules(sourceRules);

  const updated = await prisma.$transaction(async (tx) => {
    await activateRulesVersion(doc.organizationId, approvedRules, user, doc.id, tx);
    await tx.extractedPolicyRule.updateMany({
      where: { policyDocumentId: doc.id },
      data: { status: 'APPROVED' },
    });
    return tx.policyDocument.update({
      where: { id: doc.id },
      data: { status: 'APPROVED' },
      include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
    });
  });

  return serializeDocument(updated);
};

// Manual policy builder — lets a non-technical admin set rules directly through
// a form instead of uploading and parsing a document. Feeds the exact same
// LeavePolicyVersion pipeline the document flow uses, so evaluateLeaveRequest()
// never needs to know which path the active rules came from.
const saveManualPolicyRules = async (leavePolicies, user) => {
  const approvedRules = validateParsedRules({ parser: 'manual-entry', confidence: 1, leavePolicies });
  const version = await prisma.$transaction(
    (tx) => activateRulesVersion(user.organizationId, approvedRules, user, null, tx),
  );
  return { policyVersionId: version.id, version: version.version, rulesJson: approvedRules };
};

const getActiveRulesByType = async (organizationId) => {
  const active = await prisma.leavePolicyVersion.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });
  const rules = {};
  if (!active?.rulesJson?.leavePolicies) return rules;
  active.rulesJson.leavePolicies.forEach((rule) => {
    rules[rule.leaveType] = { ...rule, policyVersionId: active.id };
  });
  return rules;
};

// Org-configurable display label per leave type — e.g. an org that calls
// ANNUAL leave "EL" internally sets displayName once, and every page shows
// "EL" instead of the raw enum's title-cased default.
const getLeaveTypeLabels = async (organizationId) => {
  const rulesByType = await getActiveRulesByType(organizationId);
  const labels = {};
  Object.entries(rulesByType).forEach(([type, rule]) => {
    labels[type] = rule.displayName || titleCaseLeaveType(type);
  });
  return labels;
};

// Full active version, for the manual policy builder to pre-fill with current
// rules instead of always starting from a blank form (so admins can edit, not
// just re-create from scratch).
const getActivePolicyVersion = async (organizationId) => {
  const active = await prisma.leavePolicyVersion.findFirst({
    where: { organizationId, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });
  if (!active) return null;
  return { id: active.id, version: active.version, effectiveFrom: active.effectiveFrom, rulesJson: active.rulesJson };
};

const saveDecision = async (decision, actor = null) => {
  const entry = await prisma.leaveDecisionLog.create({
    data: {
      organizationId: decision.organizationId,
      leaveRequestId: decision.leaveRequestId,
      employeeId: decision.employeeId,
      decision: decision.decision,
      confidence: Number(decision.confidence || 0),
      reasons: decision.reasons || [],
      requiredApprovals: decision.requiredApprovals || [],
      policyVersionId: decision.policyVersionId || null,
      evaluatedBy: actor?.id || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: decision.organizationId,
      userId: actor?.id || decision.employeeId || null,
      action: decision.decision === 'AUTO_REJECTED' || decision.decision === 'REJECTED' ? 'REJECT' : 'UPDATE',
      entity: 'LeaveDecision',
      entityId: decision.leaveRequestId || null,
      newValues: entry,
    },
  }).catch(() => {});

  return entry;
};

const getDecisionForLeave = async (leaveRequestId) => {
  return prisma.leaveDecisionLog.findFirst({
    where: { leaveRequestId },
    orderBy: { createdAt: 'desc' },
  });
};

const evaluateLeaveRequest = async ({ leave, draft, actor = null, excludeLeaveId = null }) => {
  const request = leave || draft;
  if (!request) throw new ApiError(400, 'Leave request is required for evaluation');

  const employeeId = request.employeeId || actor?.id;
  const organizationId = request.organizationId || actor?.organizationId;
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, organizationId },
    select: {
      id: true, roleId: true, managerId: true, organizationId: true, joiningDate: true, departmentId: true,
      customRole: { select: { name: true, tier: true } },
    },
  });
  if (!employee) throw new ApiError(404, 'Employee not found in organization');

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const reasons = [];
  let requiredApprovals = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    reasons.push('Invalid leave date range');
  }

  const totalDays = request.totalDays || countBusinessDays(start, end);
  if (totalDays <= 0) reasons.push('Leave range has no working days');

  const rulesByType = await getActiveRulesByType(organizationId);
  const approvedRules = rulesByType[request.leaveType];
  const leaveLabel = approvedRules?.displayName || titleCaseLeaveType(request.leaveType);

  const policy = await prisma.leavePolicy.findFirst({
    where: { organizationId, leaveType: request.leaveType },
  });
  if (!policy) reasons.push(`No active ${leaveLabel} leave policy exists`);
  if (policy && !policy.applicableRoleIds.includes(employee.roleId)) {
    reasons.push(`${leaveLabel} is not applicable to role ${employee.customRole.name}`);
  }

  const year = start.getFullYear();
  const balance = policy
    ? await prisma.leaveBalance.findFirst({ where: { organizationId, userId: employeeId, policyId: policy.id, year } })
    : null;
  if (!balance) reasons.push(`Leave balance for ${leaveLabel} does not exist for ${year}`);
  if (balance && balance.remainingDays < totalDays) {
    reasons.push(`Insufficient leave balance. Required ${totalDays}, available ${balance.remainingDays}`);
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      organizationId,
      employeeId,
      id: excludeLeaveId ? { not: excludeLeaveId } : undefined,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) reasons.push('Leave overlaps an existing pending or approved request');

  if (approvedRules) {
    if (approvedRules.maxConsecutiveDays && totalDays > approvedRules.maxConsecutiveDays) {
      reasons.push(`Exceeds max consecutive days (${approvedRules.maxConsecutiveDays})`);
    }
    if (approvedRules.minNoticeDays) {
      const noticeMs = start.getTime() - Date.now();
      const noticeDays = Math.ceil(noticeMs / (1000 * 60 * 60 * 24));
      if (noticeDays < approvedRules.minNoticeDays) {
        reasons.push(`Requires at least ${approvedRules.minNoticeDays} days notice`);
      }
    }
    if (approvedRules.requiresMedicalCertificateAfterDays && totalDays > approvedRules.requiresMedicalCertificateAfterDays) {
      requiredApprovals.push('DOCUMENT');
      reasons.push(`Medical certificate required after ${approvedRules.requiresMedicalCertificateAfterDays} sick days`);
    }
    if (approvedRules.requiresAdminApproval) requiredApprovals.push('ADMIN');

    // Department staffing-shortage guard: even a request that otherwise qualifies for
    // auto-approval gets routed to a manager if too many of the same department are
    // already off on overlapping dates. This never rejects the request outright — a
    // staffing squeeze isn't the employee's fault, it just needs a human's judgment.
    let shortageBlocksAutoApprove = false;
    if (approvedRules.maxConcurrentLeavePercent != null && employee.departmentId) {
      const departmentHeadcount = await prisma.user.count({
        where: { organizationId, departmentId: employee.departmentId, isActive: true },
      });
      const overlappingApproved = await prisma.leaveRequest.count({
        where: {
          organizationId,
          id: excludeLeaveId ? { not: excludeLeaveId } : undefined,
          status: 'APPROVED',
          employee: { departmentId: employee.departmentId },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      const concurrentPercent = departmentHeadcount ? ((overlappingApproved + 1) / departmentHeadcount) * 100 : 0;
      if (concurrentPercent > approvedRules.maxConcurrentLeavePercent) {
        shortageBlocksAutoApprove = true;
        requiredApprovals.push('MANAGER');
        reasons.push(`Department staffing threshold reached (${Math.round(concurrentPercent)}% would be on leave, limit ${approvedRules.maxConcurrentLeavePercent}%) — routed to manager for staffing review`);
      }
    }

    const withinAutoApproveWindow = !shortageBlocksAutoApprove
      && approvedRules.autoApproveMaxDays != null && totalDays <= approvedRules.autoApproveMaxDays;
    if (approvedRules.requiresManagerApproval && !withinAutoApproveWindow) {
      requiredApprovals.push('MANAGER');
    } else if (withinAutoApproveWindow) {
      reasons.push(`Within auto-approve window (up to ${approvedRules.autoApproveMaxDays} day(s) for ${request.leaveType})`);
    }
  } else {
    requiredApprovals.push(employee.managerId ? 'MANAGER' : 'ADMIN');
  }

  // Who reviews a request escalates with the REQUESTER's own position in the
  // hierarchy, not a flat policy flag applied identically to everyone:
  //   - a plain employee's request only ever needs their manager — an
  //     admin-approval flag on the policy is meant for the level above a
  //     manager, not stacked onto ordinary employee requests, so it's
  //     dropped here rather than stalling a routine 1-day CL on an admin's
  //     desk;
  //   - a manager's own request skips "manager" review entirely (reviewing
  //     a peer manager doesn't fit the model) and escalates straight to
  //     admin, whether it was the manager-approval or admin-approval flag
  //     that triggered it;
  //   - an admin's own request has no one above it in the normal org
  //     hierarchy, so it's never held for approval at all.
  const requesterTier = employee.customRole?.tier;
  if (requesterTier === 'ADMIN' || requesterTier === 'SUPER_ADMIN') {
    requiredApprovals = requiredApprovals.filter((level) => level !== 'MANAGER' && level !== 'ADMIN');
  } else if (requesterTier === 'MANAGER') {
    requiredApprovals = requiredApprovals.map((level) => (level === 'MANAGER' ? 'ADMIN' : level));
  } else {
    requiredApprovals = requiredApprovals.filter((level) => level !== 'ADMIN');
  }

  let decision = 'NEEDS_HUMAN_REVIEW';
  if (reasons.some((reason) => /Invalid|No active|not applicable|does not exist|Insufficient|overlaps|Exceeds|notice/i.test(reason))) {
    decision = 'AUTO_REJECTED';
  } else if (requiredApprovals.includes('DOCUMENT')) {
    decision = 'REQUIRES_DOCUMENT';
  } else if (requiredApprovals.includes('ADMIN')) {
    decision = 'PENDING_ADMIN';
  } else if (requiredApprovals.includes('MANAGER')) {
    decision = 'PENDING_MANAGER';
  } else {
    decision = 'AUTO_APPROVED';
  }

  return {
    leaveRequestId: leave?.id || null,
    organizationId,
    employeeId,
    decision,
    confidence: approvedRules ? 0.9 : 0.72,
    reasons: reasons.length ? reasons : ['Request satisfies active policy and balance rules'],
    requiredApprovals: [...new Set(requiredApprovals)],
    policyVersionId: approvedRules?.policyVersionId || null,
  };
};

module.exports = {
  uploadPolicyDocument,
  extractPolicyDocument,
  aiParsePolicyDocument,
  approvePolicyRules,
  saveManualPolicyRules,
  getActivePolicyVersion,
  getLeaveTypeLabels,
  evaluateLeaveRequest,
  saveDecision,
  getDecisionForLeave,
};
