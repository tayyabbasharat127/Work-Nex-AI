const dotenv = require('dotenv');

dotenv.config();

const VALID_ENVIRONMENTS = new Set(['development', 'test', 'production']);

const read = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value.trim();
};

const required = (name) => {
  const value = read(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const boolean = (name, fallback = false) => {
  const value = read(name);
  if (value === undefined) return fallback;
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
  throw new Error(`${name} must be a boolean`);
};

const integer = (name, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const raw = read(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

const number = (name, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const raw = read(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }
  return value;
};

const url = (name, { requiredValue = false, protocols = ['http:', 'https:'] } = {}) => {
  const value = requiredValue ? required(name) : read(name);
  if (!value) return undefined;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${name} must use one of: ${protocols.join(', ')}`);
  }
  return value.replace(/\/$/, '');
};

const list = (name, fallback = []) => {
  const value = read(name);
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const nodeEnv = read('NODE_ENV', 'development');
if (!VALID_ENVIRONMENTS.has(nodeEnv)) {
  throw new Error(`NODE_ENV must be one of: ${[...VALID_ENVIRONMENTS].join(', ')}`);
}

const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';
const bootstrapSuperAdmin = boolean('BOOTSTRAP_SUPER_ADMIN', false);

const databaseUrl = read('DATABASE_URL');
const jwtSecret = read('JWT_SECRET');
const jwtRefreshSecret = read('JWT_REFRESH_SECRET');
const frontendUrl = url('FRONTEND_URL', { requiredValue: isProduction });
const aiServiceUrl = url('AI_SERVICE_URL', { requiredValue: isProduction });
const emailProvider = read('EMAIL_PROVIDER', 'smtp').toLowerCase();
if (!['smtp', 'brevo', 'gmail_api'].includes(emailProvider)) {
  throw new Error('EMAIL_PROVIDER must be one of: smtp, brevo, gmail_api');
}
const smtpHost = read('SMTP_HOST');
const smtpPort = integer('SMTP_PORT', undefined, { min: 1, max: 65535 });
const smtpUser = read('SMTP_USER');
const smtpPass = read('SMTP_PASS');
const brevoApiKey = read('BREVO_API_KEY');
const gmailOAuthClientId = read('GMAIL_OAUTH_CLIENT_ID');
const gmailOAuthClientSecret = read('GMAIL_OAUTH_CLIENT_SECRET');
const gmailOAuthRefreshToken = read('GMAIL_OAUTH_REFRESH_TOKEN');
const emailFrom = read('EMAIL_FROM');
const cookieSameSite = read('COOKIE_SAME_SITE', 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be one of: strict, lax, none');
}

if (isProduction) {
  required('DATABASE_URL');
  required('JWT_SECRET');
  required('JWT_REFRESH_SECRET');
  required('ENCRYPTION_KEY');
  if (emailProvider === 'brevo') {
    required('BREVO_API_KEY');
  } else if (emailProvider === 'gmail_api') {
    required('GMAIL_OAUTH_CLIENT_ID');
    required('GMAIL_OAUTH_CLIENT_SECRET');
    required('GMAIL_OAUTH_REFRESH_TOKEN');
  } else {
    required('SMTP_HOST');
    required('SMTP_PORT');
    required('SMTP_USER');
    required('SMTP_PASS');
  }
  required('EMAIL_FROM');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
  if (jwtRefreshSecret.length < 32) throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
  if (jwtSecret === jwtRefreshSecret) throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
}

let superAdminEmail;
let superAdminPassword;
if (bootstrapSuperAdmin) {
  superAdminEmail = required('SUPER_ADMIN_EMAIL').toLowerCase();
  superAdminPassword = required('SUPER_ADMIN_PASSWORD');
  if (!/^\S+@\S+\.\S+$/.test(superAdminEmail)) throw new Error('SUPER_ADMIN_EMAIL must be a valid email address');
  if (superAdminPassword.length < 12) throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters');
}

const configuredOrigins = list('CORS_ALLOWED_ORIGINS', frontendUrl ? [frontendUrl] : []);
for (const origin of configuredOrigins) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error(`CORS_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
  }
}

const config = Object.freeze({
  env: nodeEnv,
  isProduction,
  isTest,
  port: integer('PORT', 5000, { min: 1, max: 65535 }),
  databaseUrl,
  frontendUrl,
  aiServiceUrl,
  encryptionKey: read('ENCRYPTION_KEY'),
  trustProxy: read('TRUST_PROXY', isProduction ? '1' : 'false'),
  corsOrigins: configuredOrigins,
  apiRateLimitMax: integer('API_RATE_LIMIT_MAX', isProduction ? 200 : 2000, { min: 1 }),
  authRateLimitMax: integer('AUTH_RATE_LIMIT_MAX', isProduction ? 20 : 500, { min: 1 }),
  biometricWebhookRateLimit: integer('BIOMETRIC_WEBHOOK_RATE_LIMIT', 120, { min: 1 }),
  iclockRateLimitMax: integer('ICLOCK_RATE_LIMIT_MAX', 600, { min: 1 }),
  biometricAllowedHosts: Object.freeze(list('BIOMETRIC_ALLOWED_HOSTS').map((host) => host.toLowerCase())),
  jwt: Object.freeze({
    accessSecret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiresIn: read('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: read('JWT_REFRESH_EXPIRES_IN', '30d'),
    issuer: read('JWT_ISSUER', 'worknex-backend'),
    audience: read('JWT_AUDIENCE', 'worknex-platform'),
    twoFactorChallengeExpiresIn: read('TWO_FA_CHALLENGE_EXPIRES_IN', '5m'),
  }),
  cookies: Object.freeze({
    refreshName: read('REFRESH_COOKIE_NAME', 'refreshToken'),
    domain: read('COOKIE_DOMAIN'),
    sameSite: cookieSameSite,
    secure: boolean('COOKIE_SECURE', isProduction),
    maxAgeMs: integer('REFRESH_COOKIE_MAX_AGE_MS', 30 * 24 * 60 * 60 * 1000, { min: 60_000 }),
  }),
  storage: Object.freeze({
    driver: read('STORAGE_DRIVER', isProduction ? 's3' : 'local'),
    localRoot: read('LOCAL_STORAGE_ROOT', 'storage'),
    s3Bucket: read('S3_BUCKET'),
    s3Prefix: read('S3_PREFIX', 'worknex'),
    awsRegion: read('AWS_REGION'),
  }),
  schedulersEnabled: boolean('SCHEDULERS_ENABLED', !isProduction),
  etlEnabled: boolean('ETL_ENABLED', false),
  bootstrapSuperAdmin,
  superAdminEmail,
  superAdminPassword,
  logLevel: read('LOG_LEVEL', isProduction ? 'info' : 'debug'),
  logToFile: boolean('LOG_TO_FILE', false),
  metricsEnabled: boolean('METRICS_ENABLED', isProduction),
  shutdownTimeoutMs: integer('SHUTDOWN_TIMEOUT_MS', 30_000, { min: 1000, max: 120_000 }),
  email: Object.freeze({
    provider: emailProvider,
    host: smtpHost,
    port: smtpPort,
    secure: boolean('SMTP_SECURE', smtpPort === 465),
    user: smtpUser,
    password: smtpPass,
    brevoApiKey,
    gmailOAuthClientId,
    gmailOAuthClientSecret,
    gmailOAuthRefreshToken,
    from: emailFrom,
  }),
  twoFactorAppName: read('TWO_FA_APP_NAME', 'WorkNex AI'),
  modelKeysConfigured: Boolean(read('OPENAI_API_KEY') || read('GROQ_API_KEY')),
  attendance: Object.freeze({
    timezone: read('ATTENDANCE_TIMEZONE', read('ORGANIZATION_TIMEZONE', read('TZ', 'UTC'))),
    lateThresholdHour: integer('LATE_THRESHOLD_HOUR', 9, { min: 0, max: 23 }),
    lateThresholdMinute: integer('LATE_THRESHOLD_MIN', 30, { min: 0, max: 59 }),
    halfDayHours: number('HALF_DAY_HOURS', 4, { min: 0, max: 24 }),
    wifiVerificationEnabled: boolean('WIFI_VERIFICATION_ENABLED', false),
    officeIpRanges: Object.freeze(list('OFFICE_IP_RANGES')),
  }),
  tms: Object.freeze({
    enabled: Boolean(read('TMS_MODE') || read('TMS_API_URL') || read('TMS_SFTP_HOST')),
    mode: read('TMS_MODE', 'HTTP').toUpperCase(),
    apiUrl: url('TMS_API_URL'),
    apiKey: read('TMS_API_KEY'),
    apiUser: read('TMS_API_USER'),
    apiPassword: read('TMS_API_PASS'),
    timeoutMs: integer('TMS_TIMEOUT_MS', 10_000, { min: 1000, max: 120_000 }),
    retryCount: integer('TMS_RETRY_COUNT', 3, { min: 0, max: 10 }),
    lateCutoffHour: integer('TMS_LATE_CUTOFF_H', 9, { min: 0, max: 23 }),
    sftpHost: read('TMS_SFTP_HOST'),
    sftpPort: integer('TMS_SFTP_PORT', 22, { min: 1, max: 65535 }),
    sftpUser: read('TMS_SFTP_USER'),
    sftpPassword: read('TMS_SFTP_PASS'),
    sftpPath: read('TMS_SFTP_PATH', '/attendance'),
  }),
  powerBi: Object.freeze({
    tenantId: read('POWERBI_TENANT_ID'),
    clientId: read('POWERBI_CLIENT_ID'),
    clientSecret: read('POWERBI_CLIENT_SECRET'),
    workspaceId: read('POWERBI_WORKSPACE_ID'),
    reportId: read('POWERBI_REPORT_ID'),
    datasetId: read('POWERBI_DATASET_ID'),
    embedUrl: url('POWERBI_EMBED_URL'),
  }),
});

if (isProduction && config.storage.driver === 's3') {
  required('S3_BUCKET');
  required('AWS_REGION');
}

if (!['local', 's3'].includes(config.storage.driver)) throw new Error('STORAGE_DRIVER must be local or s3');
if (!['HTTP', 'API', 'SFTP'].includes(config.tms.mode)) throw new Error('TMS_MODE must be HTTP, API, or SFTP');
if (config.cookies.sameSite === 'none' && !config.cookies.secure) {
  throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none');
}
if (config.attendance.wifiVerificationEnabled && config.attendance.officeIpRanges.length === 0) {
  throw new Error('OFFICE_IP_RANGES is required when WIFI_VERIFICATION_ENABLED is true');
}

const powerBiRequired = ['tenantId', 'clientId', 'clientSecret', 'workspaceId', 'reportId'];
const configuredPowerBiFields = powerBiRequired.filter((field) => config.powerBi[field]);
if (configuredPowerBiFields.length > 0 && configuredPowerBiFields.length !== powerBiRequired.length) {
  throw new Error('Power BI configuration is partial; tenant, client, secret, workspace, and report are required together');
}

module.exports = { config };
