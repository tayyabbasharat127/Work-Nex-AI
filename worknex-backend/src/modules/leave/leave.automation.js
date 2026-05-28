const fs = require('fs');
const path = require('path');
const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { countBusinessDays } = require('../../utils/dateHelpers');

const DATA_DIR = path.join(process.cwd(), 'storage', 'leave-automation');
const DOC_DIR = path.join(DATA_DIR, 'documents');

const ensureDocumentStorage = () => {
  fs.mkdirSync(DOC_DIR, { recursive: true });
};

const normalizeLeaveType = (value = '') => value.toUpperCase().replace(/[^A-Z_]/g, '_');

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
  const knownTypes = ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'];
  const found = knownTypes.filter((type) => upper.includes(type));
  const types = found.length ? found : ['ANNUAL'];

  return {
    parser: process.env.OPENAI_API_KEY ? 'deterministic-fallback-no-llm-call' : 'deterministic-fallback',
    confidence: found.length ? 0.72 : 0.42,
    leavePolicies: types.map((leaveType) => {
      const lowerType = leaveType.toLowerCase();
      const window = text.match(new RegExp(`.{0,120}${leaveType}.{0,240}`, 'is'))?.[0] || text;
      return {
        leaveType,
        annualQuota: parseNumberNear(window, /(\d+)\s*(?:days?|annual quota|per year)/i, leaveType === 'ANNUAL' ? 18 : null),
        maxConsecutiveDays: parseNumberNear(window, /max(?:imum)?\s*(?:consecutive)?\s*(\d+)\s*days?/i, null),
        minNoticeDays: parseNumberNear(window, /(?:notice|min(?:imum)? notice).*?(\d+)\s*days?/i, lowerType === 'annual' ? 7 : null),
        applicableRoles: parseRoles(window),
        carryForwardAllowed: /carry\s*forward/i.test(window),
        maxCarryForwardDays: parseNumberNear(window, /carry\s*forward.*?(\d+)\s*days?/i, 0),
        requiresManagerApproval: !/auto[- ]?approve/i.test(window),
        requiresAdminApproval: /admin approval|hr approval|human resources approval/i.test(window),
        requiresMedicalCertificateAfterDays: leaveType === 'SICK'
          ? parseNumberNear(window, /medical certificate.*?(\d+)\s*days?/i, 2)
          : null,
        probationAllowed: !/probation.*not allowed|not allowed.*probation/i.test(window),
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
      annualQuota: rule.annualQuota === null || rule.annualQuota === undefined ? null : Number(rule.annualQuota),
      maxConsecutiveDays: rule.maxConsecutiveDays === null || rule.maxConsecutiveDays === undefined ? null : Number(rule.maxConsecutiveDays),
      minNoticeDays: rule.minNoticeDays === null || rule.minNoticeDays === undefined ? null : Number(rule.minNoticeDays),
      applicableRoles: Array.isArray(rule.applicableRoles) && rule.applicableRoles.length ? rule.applicableRoles : ['EMPLOYEE'],
      carryForwardAllowed: Boolean(rule.carryForwardAllowed),
      maxCarryForwardDays: Number(rule.maxCarryForwardDays || 0),
      requiresManagerApproval: rule.requiresManagerApproval !== false,
      requiresAdminApproval: Boolean(rule.requiresAdminApproval),
      requiresMedicalCertificateAfterDays: rule.requiresMedicalCertificateAfterDays === null || rule.requiresMedicalCertificateAfterDays === undefined
        ? null
        : Number(rule.requiresMedicalCertificateAfterDays),
      probationAllowed: rule.probationAllowed !== false,
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
  const parsedRules = validateParsedRules(deterministicParse(extractedText));

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

const approvePolicyRules = async (documentId, rules, user) => {
  const doc = await findDocument(documentId, user);
  const sourceRules = rules?.leavePolicies ? rules : parsedRulesFromRecords(doc.extractedRules);
  const approvedRules = validateParsedRules(sourceRules);

  const updated = await prisma.$transaction(async (tx) => {
    const latest = await tx.leavePolicyVersion.findFirst({
      where: { organizationId: doc.organizationId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    await tx.leavePolicyVersion.updateMany({
      where: { organizationId: doc.organizationId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED', effectiveTo: new Date() },
    });
    await tx.extractedPolicyRule.updateMany({
      where: { policyDocumentId: doc.id },
      data: { status: 'APPROVED' },
    });
    await tx.leavePolicyVersion.create({
      data: {
        organizationId: doc.organizationId,
        policyDocumentId: doc.id,
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
        organizationId: doc.organizationId,
        userId: user.id,
        action: 'APPROVE',
        entity: 'LeavePolicyDocument',
        entityId: doc.id,
        newValues: approvedRules,
      },
    });
    return tx.policyDocument.update({
      where: { id: doc.id },
      data: { status: 'APPROVED' },
      include: { extractedRules: true, policyVersions: { orderBy: { version: 'desc' } } },
    });
  });

  return serializeDocument(updated);
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
    select: { id: true, role: true, managerId: true, organizationId: true, joiningDate: true },
  });
  if (!employee) throw new ApiError(404, 'Employee not found in organization');

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const reasons = [];
  const requiredApprovals = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    reasons.push('Invalid leave date range');
  }

  const totalDays = request.totalDays || countBusinessDays(start, end);
  if (totalDays <= 0) reasons.push('Leave range has no working days');

  const policy = await prisma.leavePolicy.findFirst({
    where: { organizationId, leaveType: request.leaveType },
  });
  if (!policy) reasons.push(`No active ${request.leaveType} leave policy exists`);
  if (policy && !policy.applicableRoles.includes(employee.role)) {
    reasons.push(`${request.leaveType} is not applicable to role ${employee.role}`);
  }

  const year = start.getFullYear();
  const balance = policy
    ? await prisma.leaveBalance.findFirst({ where: { organizationId, userId: employeeId, policyId: policy.id, year } })
    : null;
  if (!balance) reasons.push(`Leave balance for ${request.leaveType} does not exist for ${year}`);
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

  const approvedRules = (await getActiveRulesByType(organizationId))[request.leaveType];
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
    if (approvedRules.requiresManagerApproval) requiredApprovals.push('MANAGER');
  } else {
    requiredApprovals.push(employee.managerId ? 'MANAGER' : 'ADMIN');
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
  evaluateLeaveRequest,
  saveDecision,
  getDecisionForLeave,
};
