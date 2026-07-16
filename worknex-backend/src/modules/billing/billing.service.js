const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../config/db');
const { config } = require('../../config/env');
const { ApiError } = require('../../utils/ApiError');
const { sendEmail } = require('../../config/email');
const { organizationWelcomeEmail, organizationVerificationEmail } = require('../../utils/emailTemplates');
const { PLANS, TAX_RATE, ANNUAL_DISCOUNT } = require('./billing.plans');
const { ensureDefaultLeavePolicies, ensureLeaveBalancesForUser } = require('../leave/leave.defaults');
const { ensureSystemRoles } = require('../../utils/systemRoles');
const authService = require('../auth/auth.service');

const VERIFICATION_MINUTES = 10;
const COMPLETION_TOKEN_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const CURRENT_TERMS_VERSION = '2026-07-14';

const hashValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashVerificationCode = (signupId, code) => crypto
  .createHmac('sha256', config.jwt.accessSecret)
  .update(`${signupId}:${code}`)
  .digest('hex');
const newVerificationCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
const addMinutes = (minutes) => new Date(Date.now() + minutes * 60 * 1000);

const generateLicenseKey = () => {
  const seg = () => uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
  return 'WNX-' + seg() + '-' + seg() + '-' + seg();
};

const generateInvoiceNumber = async () => {
  const count = await prisma.invoice.count();
  return 'INV-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');
};

const calcPricing = (planType, billingCycle) => {
  const plan = PLANS[planType];
  if (!plan) throw new ApiError(400, 'Invalid plan type');
  if (planType === 'ENTERPRISE') throw new ApiError(400, 'Enterprise requires contacting sales');
  const basePrice = billingCycle === 'ANNUAL' ? plan.priceAnnual : plan.priceMonthly;
  const discount  = billingCycle === 'ANNUAL' ? ANNUAL_DISCOUNT * 100 : 0;
  const tax       = parseFloat((basePrice * TAX_RATE).toFixed(2));
  const total     = parseFloat((basePrice + tax).toFixed(2));
  return { basePrice, discount, tax, total };
};

const getPeriodDates = (billingCycle) => {
  const start = new Date();
  const end   = new Date();
  if (billingCycle === 'ANNUAL') { end.setFullYear(end.getFullYear() + 1); }
  else { end.setMonth(end.getMonth() + 1); }
  return { start, end };
};

// Non-blocking email helper
const trySendEmail = async (to, subject, html) => {
  try { await sendEmail(to, subject, html); } catch { /* SMTP not configured */ }
};

const generateOwnerEmployeeId = () => `OWNER-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;

const SELF_SERVE_PLAN_TYPES = ['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'];
const VERIFIED_SELF_SERVE_PLAN_TYPES = ['STARTER', 'GROWTH', 'BUSINESS'];

const sendVerificationCode = async (signup, code) => {
  const email = organizationVerificationEmail({
    firstName: signup.firstName,
    code,
    expiresInMinutes: VERIFICATION_MINUTES,
  });
  try {
    await sendEmail(signup.email, email.subject, email.html);
  } catch (error) {
    if (config.isProduction) throw new ApiError(503, 'Verification email could not be sent. Please try again.');
  }
};

const startOrganizationRegistration = async (data) => {
  const email = data.ownerEmail.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ApiError(409, 'Email already registered');
  }

  const existing = await prisma.organizationSignup.findUnique({ where: { email } });
  if (existing && Date.now() - existing.lastCodeSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Please wait one minute before requesting another code');
  }

  const signupId = existing?.id || uuidv4();
  const code = newVerificationCode();
  const passwordHash = await bcrypt.hash(data.ownerPassword, 12);
  const signup = await prisma.organizationSignup.upsert({
    where: { email },
    update: {
      firstName: data.ownerFirstName,
      lastName: data.ownerLastName,
      passwordHash,
      verificationCodeHash: hashVerificationCode(signupId, code),
      verificationExpiresAt: addMinutes(VERIFICATION_MINUTES),
      verificationAttempts: 0,
      lastCodeSentAt: new Date(),
      verifiedAt: null,
      completionTokenHash: null,
      completionTokenExpiresAt: null,
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    },
    create: {
      id: signupId,
      email,
      firstName: data.ownerFirstName,
      lastName: data.ownerLastName,
      passwordHash,
      verificationCodeHash: hashVerificationCode(signupId, code),
      verificationExpiresAt: addMinutes(VERIFICATION_MINUTES),
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });
  try {
    await sendVerificationCode(signup, code);
  } catch (error) {
    await prisma.organizationSignup.update({
      where: { id: signup.id },
      data: { lastCodeSentAt: new Date(0) },
    });
    throw error;
  }
  return {
    registrationId: signup.id,
    email: signup.email.replace(/(^.).*(@.*$)/, '$1***$2'),
    verificationExpiresAt: signup.verificationExpiresAt,
    ...(config.isProduction ? {} : { developmentVerificationCode: code }),
  };
};

const resendOrganizationVerification = async (registrationId) => {
  const signup = await prisma.organizationSignup.findUnique({ where: { id: registrationId } });
  if (!signup || signup.verifiedAt) throw new ApiError(400, 'Registration cannot be resent');
  if (Date.now() - signup.lastCodeSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new ApiError(429, 'Please wait one minute before requesting another code');
  }
  const code = newVerificationCode();
  const updated = await prisma.organizationSignup.update({
    where: { id: signup.id },
    data: {
      verificationCodeHash: hashVerificationCode(signup.id, code),
      verificationExpiresAt: addMinutes(VERIFICATION_MINUTES),
      verificationAttempts: 0,
      lastCodeSentAt: new Date(),
    },
  });
  try {
    await sendVerificationCode(updated, code);
  } catch (error) {
    await prisma.organizationSignup.update({
      where: { id: updated.id },
      data: { lastCodeSentAt: new Date(0) },
    });
    throw error;
  }
  return {
    registrationId: updated.id,
    verificationExpiresAt: updated.verificationExpiresAt,
    ...(config.isProduction ? {} : { developmentVerificationCode: code }),
  };
};

const verifyOrganizationEmail = async (registrationId, code) => {
  const signup = await prisma.organizationSignup.findUnique({ where: { id: registrationId } });
  if (!signup) throw new ApiError(400, 'Invalid or expired registration');
  if (signup.verifiedAt) throw new ApiError(409, 'Email is already verified');
  if (signup.verificationExpiresAt < new Date()) throw new ApiError(400, 'Verification code has expired');
  if (signup.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) throw new ApiError(429, 'Too many verification attempts');

  const expected = Buffer.from(signup.verificationCodeHash, 'hex');
  const received = Buffer.from(hashVerificationCode(signup.id, code), 'hex');
  const valid = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  if (!valid) {
    await prisma.organizationSignup.update({
      where: { id: signup.id },
      data: { verificationAttempts: { increment: 1 } },
    });
    throw new ApiError(400, 'Invalid verification code');
  }

  const completionToken = crypto.randomBytes(32).toString('base64url');
  await prisma.organizationSignup.update({
    where: { id: signup.id },
    data: {
      verifiedAt: new Date(),
      completionTokenHash: hashValue(completionToken),
      completionTokenExpiresAt: addMinutes(COMPLETION_TOKEN_MINUTES),
    },
  });
  return { completionToken, expiresInMinutes: COMPLETION_TOKEN_MINUTES };
};

const uniqueOrganizationSlug = async (name) => {
  const base = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'organization';
  if (!await prisma.organization.findUnique({ where: { slug: base }, select: { id: true } })) return base;
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
};

const completeOrganizationRegistration = async (data, metadata = {}) => {
  const signup = await prisma.organizationSignup.findFirst({
    where: {
      completionTokenHash: hashValue(data.completionToken),
      verifiedAt: { not: null },
      completionTokenExpiresAt: { gt: new Date() },
    },
  });
  if (!signup) throw new ApiError(400, 'Registration session is invalid or expired');
  if (!VERIFIED_SELF_SERVE_PLAN_TYPES.includes(data.planType)) throw new ApiError(400, 'Invalid self-service plan');
  if (await prisma.user.findUnique({ where: { email: signup.email }, select: { id: true } })) {
    throw new ApiError(409, 'Email already registered');
  }

  const selectedPlan = PLANS[data.planType];
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + PLANS.TRIAL.trialDays);
  const licenseKey = generateLicenseKey();
  const slug = await uniqueOrganizationSlug(data.orgName);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: data.orgName,
        slug,
        industry: data.industry || null,
        country: data.country,
        termsAcceptedAt: signup.termsAcceptedAt,
        termsVersion: signup.termsVersion,
      },
    });
    await tx.organizationSettings.create({
      data: {
        organizationId: organization.id,
        timezone: data.timezone,
        onboardingCompleted: false,
        onboardingStep: 'HR_CONFIGURATION',
      },
    });
    const systemRoles = await ensureSystemRoles(tx, organization.id);
    const adminDepartment = await tx.department.create({
      data: { organizationId: organization.id, name: 'Administration', description: 'Default department for organization administrators' },
    });
    const owner = await tx.user.create({
      data: {
        organizationId: organization.id,
        employeeId: generateOwnerEmployeeId(),
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        passwordHash: signup.passwordHash,
        roleId: systemRoles.ADMIN.id,
        designation: 'Organization Owner',
        joiningDate: new Date(),
        isActive: true,
        emailVerifiedAt: signup.verifiedAt,
        departmentId: adminDepartment.id,
      },
      select: { id: true },
    });
    await tx.organization.update({ where: { id: organization.id }, data: { ownerId: owner.id } });
    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        plan: selectedPlan.type,
        status: 'TRIAL',
        billingCycle: 'MONTHLY',
        maxEmployees: selectedPlan.maxEmployees,
        pricePerMonth: 0,
        discountPercent: 0,
        trialEndsAt: trialEnd,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        licenseKey,
      },
    });
    const policies = await ensureDefaultLeavePolicies(tx, organization.id, systemRoles);
    await ensureLeaveBalancesForUser(tx, organization.id, owner.id, policies);
    await tx.organizationSignup.delete({ where: { id: signup.id } });
    return { organization, ownerId: owner.id };
  });

  const session = await authService.createSessionForUser(result.ownerId, metadata);
  const welcome = organizationWelcomeEmail({
    orgName: result.organization.name,
    ownerFirstName: signup.firstName,
    planName: selectedPlan.name,
    maxEmployees: selectedPlan.maxEmployees,
    trialEndsAt: trialEnd,
    licenseKey,
    loginEmail: signup.email,
    loginUrl: `${config.frontendUrl}/dashboard/admin`,
  });
  await trySendEmail(signup.email, welcome.subject, welcome.html);
  return {
    ...session,
    organization: result.organization,
    licenseKey,
    trialEndsAt: trialEnd,
    onboardingPath: '/onboarding',
  };
};

const registerOrganization = async (data) => {
  const {
    orgName,
    industry,
    country,
    ownerEmail,
    ownerFirstName,
    ownerLastName,
    ownerPassword,
    password,
    phone,
    website,
    planType,
  } = data;
  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw new ApiError(409, 'Organization name already taken');

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) throw new ApiError(409, 'Owner email already registered');

  const rawPassword = ownerPassword || password;
  if (!rawPassword) throw new ApiError(400, 'Owner password is required');

  // Signup always starts on a 14-day trial (no payment collected) — but the
  // trial is *of* the plan the customer picked, not a separate flat "Trial"
  // tier. Falls back to PLANS.TRIAL (10 employees) only when no plan was
  // selected, so this stays backward-compatible with older signup payloads.
  const selectedPlan = SELF_SERVE_PLAN_TYPES.includes(planType) ? PLANS[planType] : PLANS.TRIAL;

  const trialEnd   = new Date();
  trialEnd.setDate(trialEnd.getDate() + PLANS.TRIAL.trialDays);
  const licenseKey = generateLicenseKey();
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: orgName, slug, industry, country, phone, website },
    });
    const systemRoles = await ensureSystemRoles(tx, organization.id);
    const adminDepartment = await tx.department.create({
      data: {
        organizationId: organization.id,
        name: 'Administration',
        description: 'Default department for organization administrators',
      },
    });
    const owner = await tx.user.create({
      data: {
        organizationId: organization.id,
        employeeId: generateOwnerEmployeeId(),
        firstName: ownerFirstName,
        lastName: ownerLastName,
        email: ownerEmail,
        passwordHash,
        roleId: systemRoles.ADMIN.id,
        designation: 'Organization Owner',
        phone: phone || null,
        joiningDate: new Date(),
        isActive: true,
        departmentId: adminDepartment.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        organizationId: true,
        customRole: { select: { id: true, name: true, tier: true } },
      },
    });
    const updatedOrganization = await tx.organization.update({
      where: { id: organization.id },
      data: { ownerId: owner.id },
    });
    await tx.subscription.create({
      data: {
        organizationId: organization.id, plan: selectedPlan.type, status: 'TRIAL',
        billingCycle: 'MONTHLY', maxEmployees: selectedPlan.maxEmployees,
        // Trial means no charge yet regardless of which plan is being trialled.
        pricePerMonth: 0, discountPercent: 0, trialEndsAt: trialEnd,
        currentPeriodStart: new Date(), currentPeriodEnd: trialEnd, licenseKey,
      },
    });
    const policies = await ensureDefaultLeavePolicies(tx, organization.id, systemRoles);
    await ensureLeaveBalancesForUser(tx, organization.id, owner.id, policies);
    const { customRole, ...ownerRest } = owner;
    const serializedOwner = { ...ownerRest, role: customRole.tier, roleId: customRole.id, roleName: customRole.name };
    return { organization: updatedOrganization, owner: serializedOwner };
  });

  const { subject, html } = organizationWelcomeEmail({
    orgName,
    ownerFirstName,
    planName: selectedPlan.name,
    maxEmployees: selectedPlan.maxEmployees,
    trialEndsAt: trialEnd,
    licenseKey,
    loginEmail: ownerEmail,
    loginUrl: `${config.frontendUrl}/login`,
  });
  await trySendEmail(ownerEmail, subject, html);

  return { ...result, licenseKey, trialEndsAt: trialEnd };
};

const getPlans = () => {
  return Object.values(PLANS).map((p) => ({
    type: p.type, name: p.name, maxEmployees: p.maxEmployees,
    pricing: {
      monthly: p.priceMonthly, annual: p.priceAnnual, annualTotal: p.annualTotal,
      annualSavings: p.priceMonthly
        ? parseFloat((p.priceMonthly * 12 - (p.annualTotal || 0)).toFixed(2))
        : null,
    },
    features: p.features,
  }));
};

const subscribe = async (organizationId, planType, billingCycle, paymentMethod, paymentReference) => {
  const plan = PLANS[planType];
  if (!plan) throw new ApiError(400, 'Invalid plan');
  if (planType === 'TRIAL') throw new ApiError(400, 'Cannot subscribe to trial plan');

  const org = await prisma.organization.findUnique({
    where: { id: organizationId }, include: { subscription: true },
  });
  if (!org) throw new ApiError(404, 'Organization not found');

  const { basePrice, discount, tax, total } = calcPricing(planType, billingCycle);
  const { start, end } = getPeriodDates(billingCycle);
  const invoiceNumber  = await generateInvoiceNumber();
  const licenseKey     = generateLicenseKey();

  const result = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.upsert({
      where: { organizationId },
      update: {
        plan: planType, status: 'ACTIVE', billingCycle,
        maxEmployees: plan.maxEmployees,
        pricePerMonth: billingCycle === 'ANNUAL' ? plan.priceAnnual : plan.priceMonthly,
        discountPercent: discount, currentPeriodStart: start, currentPeriodEnd: end,
        trialEndsAt: null, cancelledAt: null, licenseKey,
      },
      create: {
        organizationId, plan: planType, status: 'ACTIVE', billingCycle,
        maxEmployees: plan.maxEmployees,
        pricePerMonth: billingCycle === 'ANNUAL' ? plan.priceAnnual : plan.priceMonthly,
        discountPercent: discount, currentPeriodStart: start, currentPeriodEnd: end, licenseKey,
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        organizationId, subscriptionId: sub.id, invoiceNumber,
        plan: planType, billingCycle, amount: basePrice, discount, tax, totalAmount: total,
        status: 'PAID', paymentMethod: paymentMethod || 'CARD',
        paymentReference: paymentReference || ('TXN-' + Date.now()),
        paidAt: new Date(), dueDate: new Date(), periodStart: start, periodEnd: end,
      },
    });

    return { subscription: sub, invoice };
  });

  const orgOwner = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { ownerId: true },
  });
  const owner = await prisma.user.findFirst({
    where: {
      organizationId,
      OR: [
        ...(orgOwner?.ownerId ? [{ id: orgOwner.ownerId }] : []),
        { customRole: { tier: 'ADMIN' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  if (owner) {
    await trySendEmail(owner.email,
      'WorkNex AI — ' + plan.name + ' Plan Activated',
      '<h2>Subscription Confirmed!</h2><p>Plan: ' + plan.name + ' | $' + total + ' | Invoice: ' + invoiceNumber + '</p>');
  }

  return result;
};

const getSubscription = async (organizationId) => {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId }, include: { organization: true },
  });
  if (!sub) throw new ApiError(404, 'No subscription found');
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((sub.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
  return { ...sub, daysRemaining, isExpired: sub.currentPeriodEnd < now, planDetails: PLANS[sub.plan] };
};

const cancelSubscription = async (organizationId) => {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) throw new ApiError(404, 'No subscription found');
  if (sub.status === 'CANCELLED') throw new ApiError(400, 'Already cancelled');
  await prisma.subscription.update({
    where: { organizationId }, data: { cancelledAt: new Date(), status: 'CANCELLED' },
  });
  return {
    message: 'Subscription cancelled. Access continues until ' + sub.currentPeriodEnd.toDateString(),
    accessUntil: sub.currentPeriodEnd,
  };
};

const getInvoices = async (organizationId) => {
  return prisma.invoice.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
};

const upgradePlan = async (organizationId, newPlan, billingCycle, paymentMethod, paymentReference) => {
  const current = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!current) throw new ApiError(404, 'No subscription found');
  const planOrder = ['TRIAL', 'STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE'];
  if (planOrder.indexOf(newPlan) <= planOrder.indexOf(current.plan)) {
    throw new ApiError(400, 'Can only upgrade to a higher plan.');
  }
  return subscribe(organizationId, newPlan, billingCycle, paymentMethod, paymentReference);
};

const checkEmployeeLimit = async (organizationId) => {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) return { allowed: false, reason: 'No active subscription' };
  const empCount = await prisma.user.count({ where: { organizationId, isActive: true } });
  const allowed  = empCount < sub.maxEmployees;
  return {
    allowed, current: empCount, max: sub.maxEmployees,
    remaining: Math.max(0, sub.maxEmployees - empCount),
    reason: allowed ? null : 'Employee limit reached (' + sub.maxEmployees + '). Please upgrade.',
  };
};

module.exports = {
  startOrganizationRegistration, resendOrganizationVerification, verifyOrganizationEmail,
  completeOrganizationRegistration, registerOrganization, getPlans, subscribe,
  getSubscription, cancelSubscription, getInvoices,
  upgradePlan, checkEmployeeLimit,
};
