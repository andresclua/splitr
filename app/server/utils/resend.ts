const HEADER = `
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:#C96A3F; padding:28px 32px; text-align:center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;vertical-align:middle;">
              <span style="color:white;font-weight:700;font-size:15px;line-height:32px;">K</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="color:white;font-weight:700;font-size:20px;letter-spacing:-0.3px;">Koryla</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`

async function send(payload: {
  to: string
  subject: string
  html: string
}) {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY not set, skipping email')
    return
  }

  const fromEmail = (config.resendFromEmail as string | undefined) || 'hello@koryla.com'
  const from = `Koryla <${fromEmail}>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, ...payload }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[resend] failed to send email:', res.status, body)
  }
}

export async function sendWelcomeEmail(to: string, workspaceName: string, appUrl: string) {
  await send({
    to,
    subject: 'Welcome to Koryla',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td>${HEADER}</td></tr>
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Welcome aboard!</h1>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.65;">
                Your workspace <strong style="color:#111827;">${workspaceName}</strong> is ready.
                Start running A/B experiments on your site in minutes — no extra code required.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#C96A3F;border-radius:8px;">
                    <a href="${appUrl}/dashboard"
                       style="display:inline-block;color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;">
                      Open Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;border-top:1px solid #f3f4f6;">
                <tr>
                  <td style="padding-top:24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Quick start</p>
                    <p style="margin:0;color:#6b7280;font-size:13px;line-height:2;">
                      1. Create your first experiment<br>
                      2. Add the Koryla script to your site<br>
                      3. Watch the results come in
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you signed up for Koryla.
                <a href="${appUrl}" style="color:#9ca3af;">koryla.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  workspaceName: string,
  inviteUrl: string,
) {
  await send({
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Koryla`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr><td>${HEADER}</td></tr>
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">You're invited!</h1>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.65;">
                <strong style="color:#111827;">${inviterName}</strong> invited you to join the
                <strong style="color:#111827;">${workspaceName}</strong> workspace on Koryla.
              </p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#C96A3F;border-radius:8px;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;color:white;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
                This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">Koryla — edge-based A/B testing</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}
