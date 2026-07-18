// Branded HTML email templates. Built with inline styles and a table-based
// layout on purpose — email clients (Outlook desktop especially) don't
// support modern CSS (flexbox, grid, custom properties), so this stays close
// to the lowest-common-denominator subset that renders consistently across
// Gmail, Outlook, and mobile mail apps.

const BRAND_BLUE = '#2f8fe0';
const BRAND_BLUE_DARK = '#1f6fb8';
const INK = '#111827';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BG = '#f8fafc';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sanitizeHeader = (value = '') => String(value).replace(/[\r\n]+/g, ' ').trim();

const wrapper = (bodyHtml) => `
<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#eef1f5; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(17,24,39,0.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg, ${BRAND_BLUE}, ${BRAND_BLUE_DARK}); padding:36px 40px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
                  <tr>
                    <td style="width:44px; height:44px; background:rgba(255,255,255,0.18); border-radius:12px; text-align:center; vertical-align:middle;">
                      <span style="font-size:22px; font-weight:800; color:#ffffff; line-height:44px;">W</span>
                    </td>
                  </tr>
                </table>
                <div style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.01em;">WorkNex AI</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 40px 32px; border-top:1px solid ${BORDER};">
                <p style="margin:0; color:${MUTED}; font-size:12px; line-height:1.6;">
                  You're receiving this email because your account is connected to a WorkNex AI workspace.
                  Please contact your organization administrator if you believe this message was sent in error.
                </p>
                <p style="margin:8px 0 0; color:${MUTED}; font-size:12px;">&copy; ${new Date().getFullYear()} WorkNex AI. All rights reserved.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const detailRow = (label, value) => `
  <tr>
    <td style="padding:10px 0; border-bottom:1px solid ${BORDER}; color:${MUTED}; font-size:13px;">${label}</td>
    <td style="padding:10px 0; border-bottom:1px solid ${BORDER}; color:${INK}; font-size:13px; font-weight:600; text-align:right;">${value}</td>
  </tr>`;

/**
 * Welcome email sent right after a brand-new organization successfully
 * registers (billing.service.js registerOrganization) — shows the org name,
 * chosen plan, and trial details so the admin has a clear confirmation of
 * exactly what was just created, not just a bare "welcome" line.
 */
const organizationWelcomeEmail = ({
  orgName,
  ownerFirstName,
  planName,
  maxEmployees,
  trialEndsAt,
  licenseKey,
  loginEmail,
  loginUrl,
}) => {
  const trialEndsLabel = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const body = `
    <h1 style="margin:0 0 6px; color:${INK}; font-size:22px; font-weight:700; letter-spacing:-0.01em;">Welcome to WorkNex AI, ${ownerFirstName}! 🎉</h1>
    <p style="margin:0 0 26px; color:${MUTED}; font-size:14.5px; line-height:1.6;">
      Your organization has been created and is ready to use. Here's a quick summary:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG}; border:1px solid ${BORDER}; border-radius:12px; padding:20px 22px; margin-bottom:28px;">
      ${detailRow('Organization', orgName)}
      ${detailRow('Plan', `${planName} (up to ${maxEmployees} employees)`)}
      ${detailRow('Trial ends', trialEndsLabel)}
      ${detailRow('License key', licenseKey)}
      ${detailRow('Login email', loginEmail)}
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
      <tr>
        <td style="border-radius:10px; background:${BRAND_BLUE};">
          <a href="${loginUrl}" style="display:inline-block; padding:13px 32px; color:#ffffff; font-size:14.5px; font-weight:600; text-decoration:none;">Go to Dashboard</a>
        </td>
      </tr>
    </table>

    <p style="margin:22px 0 0; color:${MUTED}; font-size:13px; line-height:1.6; text-align:center;">
      No credit card required during your trial. You can invite your team, set up leave policies,
      and configure attendance rules right away.
    </p>`;

  return {
    subject: `Welcome to WorkNex AI — ${orgName} is ready`,
    html: wrapper(body),
  };
};

const organizationVerificationEmail = ({ firstName, code, expiresInMinutes }) => ({
  subject: 'Verify your WorkNex AI account',
  html: wrapper(`
    <h1 style="margin:0 0 8px; color:${INK}; font-size:22px; font-weight:700;">Verify your email</h1>
    <p style="margin:0 0 24px; color:${MUTED}; font-size:14.5px; line-height:1.6;">
      Hi ${firstName}, enter this verification code to continue creating your WorkNex AI organization.
    </p>
    <div style="margin:0 auto 24px; padding:18px; border:1px solid ${BORDER}; border-radius:12px; background:${CARD_BG}; color:${INK}; font-size:30px; font-weight:800; letter-spacing:10px; text-align:center;">
      ${code}
    </div>
    <p style="margin:0; color:${MUTED}; font-size:13px; text-align:center;">
      This code expires in ${expiresInMinutes} minutes. If you did not start this registration, ignore this email.
    </p>
  `),
});

/**
 * Branded account email sent when an administrator creates a user. Every
 * dynamic value, including the initial password, is HTML-escaped.
 */
const userWelcomeEmail = ({
  firstName,
  organizationName,
  email,
  initialPassword,
  employeeId,
  roleName,
  departmentName,
  loginUrl,
  passwordWasGenerated = false,
}) => {
  const safeLoginUrl = /^https?:\/\//i.test(loginUrl || '') ? escapeHtml(loginUrl) : null;
  const loginAction = safeLoginUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="border-radius:10px; background:${BRAND_BLUE};"><a href="${safeLoginUrl}" style="display:inline-block; padding:13px 32px; color:#ffffff; font-size:14.5px; font-weight:700; text-decoration:none;">Sign in to WorkNex AI</a></td></tr></table>`
    : '';

  const body = `
    <div style="display:inline-block; margin:0 0 20px; padding:7px 12px; border:1px solid #bfdbfe; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;">Account ready</div>
    <h1 style="margin:0 0 8px; color:${INK}; font-size:23px; font-weight:750; letter-spacing:-0.02em;">Welcome to WorkNex AI, ${escapeHtml(firstName)}!</h1>
    <p style="margin:0 0 24px; color:${MUTED}; font-size:14.5px; line-height:1.65;">
      Your account for <strong style="color:${INK};">${escapeHtml(organizationName)}</strong> has been created. Use the credentials below to sign in.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG}; border:1px solid ${BORDER}; border-radius:12px; padding:18px 22px;">
      ${detailRow('Employee ID', escapeHtml(employeeId))}
      ${detailRow('Email', escapeHtml(email))}
      ${detailRow('Role', escapeHtml(roleName || 'Employee'))}
      ${departmentName ? detailRow('Department', escapeHtml(departmentName)) : ''}
    </table>

    <div style="margin:22px 0 0; padding:18px 20px; border:1px solid #bfdbfe; border-radius:12px; background:#eff6ff;">
      <p style="margin:0 0 8px; color:#1e40af; font-size:12px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;">${passwordWasGenerated ? 'Temporary password' : 'Initial password'}</p>
      <div style="padding:12px 14px; border:1px solid #93c5fd; border-radius:8px; background:#ffffff; color:${INK}; font-family:Consolas,'Courier New',monospace; font-size:17px; font-weight:700; letter-spacing:.02em; overflow-wrap:anywhere;">${escapeHtml(initialPassword)}</div>
      <p style="margin:10px 0 0; color:#475569; font-size:12.5px; line-height:1.6;">Keep this password private. We recommend changing it after your first sign-in.</p>
    </div>
    ${loginAction}`;

  return {
    subject: sanitizeHeader(`Welcome to WorkNex AI - ${organizationName} account ready`),
    html: wrapper(body),
  };
};

const STATUS_STYLES = {
  submitted: { color: '#2563eb', background: '#eff6ff', border: '#bfdbfe' },
  pending: { color: '#a16207', background: '#fefce8', border: '#fde68a' },
  approved: { color: '#047857', background: '#ecfdf5', border: '#a7f3d0' },
  rejected: { color: '#b91c1c', background: '#fef2f2', border: '#fecaca' },
};

/**
 * Branded leave-workflow email used for employee, manager, and admin updates.
 * Every dynamic value is escaped because leave reasons and review notes are
 * user-provided content and must never be interpreted as email HTML.
 */
const leaveWorkflowEmail = ({
  recipientName,
  headline,
  message,
  status = 'submitted',
  statusLabel,
  employeeName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
  note,
  actionLabel,
  actionUrl,
}) => {
  const tone = STATUS_STYLES[status] || STATUS_STYLES.submitted;
  const safeActionUrl = /^https?:\/\//i.test(actionUrl || '') ? escapeHtml(actionUrl) : null;
  const optionalReason = reason
    ? detailRow('Reason', escapeHtml(reason))
    : '';
  const optionalNote = note
    ? `<div style="margin:22px 0 0; padding:14px 16px; border-left:4px solid ${tone.color}; border-radius:8px; background:${tone.background}; color:${INK}; font-size:13px; line-height:1.6;"><strong>Review note:</strong> ${escapeHtml(note)}</div>`
    : '';
  const action = safeActionUrl && actionLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="border-radius:10px; background:${BRAND_BLUE};"><a href="${safeActionUrl}" style="display:inline-block; padding:13px 28px; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">${escapeHtml(actionLabel)}</a></td></tr></table>`
    : '';

  const body = `
    <div style="margin:0 0 22px;">
      <span style="display:inline-block; padding:7px 12px; border:1px solid ${tone.border}; border-radius:999px; background:${tone.background}; color:${tone.color}; font-size:12px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;">${escapeHtml(statusLabel || status)}</span>
    </div>
    <h1 style="margin:0 0 8px; color:${INK}; font-size:23px; font-weight:750; letter-spacing:-0.02em;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 8px; color:${INK}; font-size:14.5px; line-height:1.65;">Hi ${escapeHtml(recipientName || 'there')},</p>
    <p style="margin:0 0 26px; color:${MUTED}; font-size:14.5px; line-height:1.65;">${escapeHtml(message)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG}; border:1px solid ${BORDER}; border-radius:12px; padding:18px 22px;">
      ${employeeName ? detailRow('Employee', escapeHtml(employeeName)) : ''}
      ${detailRow('Leave type', escapeHtml(leaveType))}
      ${detailRow('From', escapeHtml(startDate))}
      ${detailRow('To', escapeHtml(endDate))}
      ${detailRow('Duration', `${escapeHtml(totalDays)} ${Number(totalDays) === 1 ? 'day' : 'days'}`)}
      ${optionalReason}
    </table>
    ${optionalNote}
    ${action}`;

  return {
    subject: sanitizeHeader(headline),
    html: wrapper(body),
  };
};

module.exports = {
  organizationWelcomeEmail,
  organizationVerificationEmail,
  userWelcomeEmail,
  leaveWorkflowEmail,
};
