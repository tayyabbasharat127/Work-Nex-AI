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
                  You're receiving this because an organization was registered on WorkNex AI with this email address.
                  If this wasn't you, you can safely ignore this email.
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

module.exports = { organizationWelcomeEmail };
