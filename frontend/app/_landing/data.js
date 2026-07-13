import {
  Clock, BarChart3, Shield, Bell,
  Brain, LineChart, Bot, AlertCircle, UserCheck,
} from 'lucide-react';

export const features = [
  {
    title: 'AI Performance Prediction',
    description: 'Predict employee performance scores using attendance, leave patterns, and work history with ML models.',
    icon: Brain,
  },
  {
    title: 'Attrition Risk Analysis',
    description: 'Identify flight-risk employees early using 13-factor attrition scoring with high/medium/low risk levels.',
    icon: AlertCircle,
  },
  {
    title: 'Leave Forecasting',
    description: '30-day AI-powered leave demand forecasting using gradient boosting with seasonal and day-of-week patterns.',
    icon: LineChart,
  },
  {
    title: 'Real-Time Attendance',
    description: 'Live clock-in/out tracking with TMS webhook sync, biometric integration, and daily status monitoring.',
    icon: Clock,
  },
  {
    title: 'Smart Leave Management',
    description: 'Policy-driven leave workflows with automated approval, balance tracking, and document verification.',
    icon: UserCheck,
  },
  {
    title: 'Multi-Agent AI Assistant',
    description: 'LangChain-powered multi-agent system with persistent memory for HR analytics, reports, and Q&A.',
    icon: Bot,
  },
  {
    title: 'Advanced Analytics',
    description: 'Department-wise attendance heatmaps, workforce headcount, turnover rates, and audit trails.',
    icon: BarChart3,
  },
  {
    title: 'Role-Based Dashboards',
    description: 'Tailored views for Admins, Managers, and Employees with granular permission controls.',
    icon: Shield,
  },
  {
    title: 'Smart Notifications',
    description: 'Real-time in-app alerts and SMTP email notifications for leaves, approvals, and anomalies.',
    icon: Bell,
  },
];

export const pricingPlans = [
  {
    name: 'Basic',
    price: '$19',
    period: '/month',
    description: 'Perfect for small teams getting started',
    badge: null,
    features: [
      'Up to 25 employees',
      'Attendance tracking & TMS sync',
      'Leave requests & balance management',
      'Email & in-app notifications',
      'Admin + Employee dashboards',
      'Basic analytics & reports',
      'SMTP email integration',
      'Email support',
    ],
    highlighted: false,
    cta: 'Get Started',
    href: '/register?plan=basic',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing teams that need AI insights',
    badge: 'Most Popular',
    features: [
      'Up to 200 employees',
      'Everything in Basic',
      'AI performance prediction',
      'Attrition risk analysis',
      '30-day leave forecasting',
      'Multi-agent AI assistant',
      'Manager dashboards',
      'ETL pipeline & Power BI',
      'API access',
      'Priority support',
    ],
    highlighted: true,
    cta: 'Start Free Trial',
    href: '/register?plan=pro',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large organizations with custom needs',
    badge: null,
    features: [
      'Unlimited employees',
      'Everything in Pro',
      'White-label branding',
      'On-premise deployment',
      'Custom AI model tuning',
      'Advanced audit & compliance',
      'Custom integrations & API',
      'Dedicated account manager',
      '24/7 SLA support',
    ],
    highlighted: false,
    cta: 'Contact Sales',
    href: null,
    scrollTo: 'contact',
  },
];

export const stats = [
  { value: '50+', label: 'Organizations' },
  { value: '10k+', label: 'Employees Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '3x', label: 'Faster HR Ops' },
];
