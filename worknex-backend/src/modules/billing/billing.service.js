const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { sendEmail } = require('../../config/email');
const { PLANS, TAX_RATE, ANNUAL_DISCOUNT } = require('./billing.plans');
const { ensureDefaultLeavePolicies, ensureLeaveBalancesForUser } = require('../leave/leave.defaults');

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
  } = data;
  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) throw new ApiError(409, 'Organization name already taken');

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) throw new ApiError(409, 'Owner email already registered');

  const rawPassword = ownerPassword || password;
  if (!rawPassword) throw new ApiError(400, 'Owner password is required');

  const trialEnd   = new Date();
  trialEnd.setDate(trialEnd.getDate() + PLANS.TRIAL.trialDays);
  const licenseKey = generateLicenseKey();
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: orgName, slug, industry, country, phone, website },
    });
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
        role: 'ADMIN',
        designation: 'Organization Owner',
        phone: phone || null,
        joiningDate: new Date(),
        isActive: true,
        departmentId: adminDepartment.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        organizationId: true,
      },
    });
    const updatedOrganization = await tx.organization.update({
      where: { id: organization.id },
      data: { ownerId: owner.id },
    });
    await tx.subscription.create({
      data: {
        organizationId: organization.id, plan: 'TRIAL', status: 'TRIAL',
        billingCycle: 'MONTHLY', maxEmployees: PLANS.TRIAL.maxEmployees,
        pricePerMonth: 0, discountPercent: 0, trialEndsAt: trialEnd,
        currentPeriodStart: new Date(), currentPeriodEnd: trialEnd, licenseKey,
      },
    });
    const policies = await ensureDefaultLeavePolicies(tx, organization.id);
    await ensureLeaveBalancesForUser(tx, organization.id, owner.id, policies);
    return { organization: updatedOrganization, owner };
  });

  await trySendEmail(ownerEmail, 'Welcome to WorkNex AI',
    '<h2>Welcome ' + ownerFirstName + '!</h2><p>Trial started. License: ' + licenseKey + '</p>');

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
        { role: 'ADMIN' },
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
  registerOrganization, getPlans, subscribe,
  getSubscription, cancelSubscription, getInvoices,
  upgradePlan, checkEmployeeLimit,
};
