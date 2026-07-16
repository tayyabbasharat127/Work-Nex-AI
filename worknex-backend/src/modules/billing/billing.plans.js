/**
 * WorkNex AI — SaaS Pricing Plans
 * All prices in USD/month
 */

const PLANS = {
  TRIAL: {
    name: 'Free Trial',
    type: 'TRIAL',
    maxEmployees: 10,
    priceMonthly: 0,
    priceAnnual: 0,
    trialDays: 14,
    features: [
      'Up to 10 employees',
      'Biometric and TMS attendance tracking',
      'Basic leave management',
      'Email notifications',
      'Standard reports',
      'No credit card required',
    ],
  },

  STARTER: {
    name: 'Starter',
    type: 'STARTER',
    maxEmployees: 25,
    priceMonthly: 29,
    priceAnnual: 23.2,        // 20% off = $278.4/year
    annualTotal: 278.4,
    trialDays: 0,
    features: [
      'Up to 25 employees',
      'Attendance tracking (manual + TMS sync)',
      'Full leave management engine',
      'Leave balance & policy management',
      'Email + in-app notifications',
      'Basic analytics dashboard',
      'Audit logs',
      'Role-based access (Admin, Manager, Employee)',
      'Email support',
    ],
  },

  GROWTH: {
    name: 'Growth',
    type: 'GROWTH',
    maxEmployees: 100,
    priceMonthly: 79,
    priceAnnual: 63.2,        // 20% off = $758.4/year
    annualTotal: 758.4,
    trialDays: 0,
    features: [
      'Up to 100 employees',
      'Everything in Starter',
      'Power BI embedded dashboards',
      'TMS biometric/card machine integration',
      'ETL pipeline (nightly data sync)',
      'Attendance heatmaps & trend analysis',
      'Department-level analytics',
      'Performance scoring & leaderboard',
      'Priority email support',
    ],
  },

  BUSINESS: {
    name: 'Business',
    type: 'BUSINESS',
    maxEmployees: 500,
    priceMonthly: 199,
    priceAnnual: 159.2,       // 20% off = $1910.4/year
    annualTotal: 1910.4,
    trialDays: 0,
    features: [
      'Up to 500 employees',
      'Everything in Growth',
      'AI Agentic Chatbot (AskWorkNex)',
      'Predictive leave demand forecasting',
      'Attendance anomaly detection',
      'Attrition risk scoring',
      'Advanced Power BI with Row-Level Security',
      'Multi-department hierarchy support',
      'Dedicated account manager',
      'Phone + email support',
    ],
  },

  ENTERPRISE: {
    name: 'Enterprise',
    type: 'ENTERPRISE',
    maxEmployees: 999999,
    priceMonthly: null,       // custom pricing
    priceAnnual: null,
    annualTotal: null,
    trialDays: 0,
    features: [
      'Unlimited employees',
      'Everything in Business',
      'Custom integrations (ERP, HRMS, Payroll)',
      'Dedicated cloud infrastructure',
      'Custom SLA (99.9% uptime guarantee)',
      'On-premise deployment option',
      'White-label branding',
      'Custom AI model training on your data',
      'Dedicated DevOps & support team',
      'Custom contract & invoicing',
    ],
  },
};

const TAX_RATE = 0.0;   // set to e.g. 0.17 for 17% GST if applicable
const ANNUAL_DISCOUNT = 0.20;

module.exports = { PLANS, TAX_RATE, ANNUAL_DISCOUNT };
