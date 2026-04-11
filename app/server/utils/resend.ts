const FROM = 'Koryla <no-reply@koryla.com>'

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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, ...payload }),
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #C96A3F; padding: 32px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: 700; font-size: 14px;">K</span>
        </div>
        <span style="color: white; font-weight: 600; font-size: 18px;">Koryla</span>
      </div>
    </div>
    <div style="padding: 40px 32px;">
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827;">Welcome aboard!</h1>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your workspace <strong style="color: #111827;">${workspaceName}</strong> is ready.
        Start running A/B experiments on your site in minutes — no extra code required.
      </p>
      <a href="${appUrl}/dashboard"
         style="display: inline-block; background: #C96A3F; color: white; text-decoration: none;
                font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
        Open Dashboard
      </a>
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #374151;">Quick start</p>
        <ol style="margin: 0; padding-left: 18px; color: #6b7280; font-size: 13px; line-height: 2;">
          <li>Create your first experiment</li>
          <li>Add the Koryla script to your site</li>
          <li>Watch the results come in</li>
        </ol>
      </div>
    </div>
    <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        You're receiving this because you signed up for Koryla.
        <a href="${appUrl}" style="color: #6b7280;">koryla.com</a>
      </p>
    </div>
  </div>
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 0;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #C96A3F; padding: 32px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: 700; font-size: 14px;">K</span>
        </div>
        <span style="color: white; font-weight: 600; font-size: 18px;">Koryla</span>
      </div>
    </div>
    <div style="padding: 40px 32px;">
      <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #111827;">You're invited!</h1>
      <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
        <strong style="color: #111827;">${inviterName}</strong> invited you to join the
        <strong style="color: #111827;">${workspaceName}</strong> workspace on Koryla.
      </p>
      <a href="${inviteUrl}"
         style="display: inline-block; background: #C96A3F; color: white; text-decoration: none;
                font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
        Accept Invitation
      </a>
      <p style="margin: 20px 0 0; font-size: 13px; color: #9ca3af;">
        This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
      </p>
    </div>
    <div style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Koryla — edge-based A/B testing
      </p>
    </div>
  </div>
</body>
</html>`,
  })
}
