import sgMail from '@sendgrid/mail';
import type { Subscriber, Prayer } from '@shared/schema';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const res = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  if (!res.ok) {
    throw new Error(`SendGrid connector request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export async function sendWelcomeEmail(toEmail: string, firstName: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: toEmail,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: 'Welcome to Pray For Change',
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a3728; text-align: center;">Welcome to Pray For Change</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${escapeHtml(firstName)},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for joining Pray For Change.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            This platform exists for a single purpose: to bring people together in collective prayer for the greater good.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            In a world that often feels divided, even one shared minute of intention has meaning.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            When you feel moved, you can offer a prayer and join a shared moment held across the world.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Welcome.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            With respect,<br/>
            The Pray For Change Team
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Welcome email sent to ${toEmail}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send welcome email to ${toEmail}:`, detail);
  }
}

export async function sendPrayerSavedEmail(toEmail: string, firstName: string, prayerTitle: string, prayerContent: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: toEmail,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: `Your Prayer Has Been Saved: ${prayerTitle}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a3728; text-align: center;">Your Prayer Has Been Saved</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${escapeHtml(firstName)},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Your prayer request has been saved. Here is a copy for your records:
          </p>
          <div style="background-color: #f9f5f0; border-left: 4px solid #c9a96e; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #4a3728; margin-top: 0;">${escapeHtml(prayerTitle)}</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${escapeHtml(prayerContent || 'Your prayer has been submitted and is being shared with the community.')}</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Others can now join you in prayer. We'll keep you updated on how many people are praying alongside you.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Blessings,<br/>
            The Pray For Change Team
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Prayer saved email sent to ${toEmail}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send prayer saved email to ${toEmail}:`, detail);
  }
}

export async function sendDailyDigestEmail(toEmail: string, firstName: string, prayerDigests: { title: string; newCount: number; totalCount: number }[]) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const prayerRows = prayerDigests.map(p => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${escapeHtml(p.title)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #c9a96e; font-weight: bold;">+${p.newCount}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #333;">${p.totalCount}</td>
      </tr>
    `).join('');

    const totalNewPrayers = prayerDigests.reduce((sum, p) => sum + p.newCount, 0);

    await client.send({
      to: toEmail,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: `${totalNewPrayers} people prayed for you today`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a3728; text-align: center;">Your Daily Prayer Update</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${escapeHtml(firstName)},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Great news! ${totalNewPrayers} ${totalNewPrayers === 1 ? 'person' : 'people'} prayed for your ${prayerDigests.length === 1 ? 'request' : 'requests'} today.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f9f5f0;">
                <th style="padding: 12px; text-align: left; color: #4a3728;">Prayer</th>
                <th style="padding: 12px; text-align: center; color: #4a3728;">Today</th>
                <th style="padding: 12px; text-align: center; color: #4a3728;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${prayerRows}
            </tbody>
          </table>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for sharing your prayers with the community.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Blessings,<br/>
            The Pray For Change Team
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Daily digest sent to ${toEmail}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send daily digest to ${toEmail}:`, detail);
  }
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: toEmail,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: 'Reset Your Password - PrayForChange',
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a3728; text-align: center;">Reset Your Password</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background-color: #c9a96e; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            If the button above doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #999; word-break: break-all;">
            ${escapeHtml(resetUrl)}
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            With respect,<br/>
            The Pray For Change Team
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Password reset email sent to ${toEmail}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send password reset email to ${toEmail}:`, detail);
  }
}

const ADMIN_EMAIL = 'support@prayforchange.org';

export async function sendModerationEmail(prayerTitle: string, prayerDescription: string, prayerContent: string, authorName: string, toneSuggestion?: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: ADMIN_EMAIL,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: `[FLAGGED] Prayer Needs Review: ${prayerTitle}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #b45309; text-align: center;">Prayer Flagged for Review</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">A prayer submitted by <strong>${escapeHtml(authorName)}</strong> was flagged by our tone analysis system as potentially negative. The author chose to continue anyway. Please review before it becomes publicly visible.</p>
          ${toneSuggestion ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #92400e; margin-top: 0;">AI Suggestion Given to User</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #78350f;">${escapeHtml(toneSuggestion)}</p>
          </div>` : ''}
          <div style="background-color: #f9f5f0; border-left: 4px solid #c9a96e; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #4a3728; margin-top: 0;">${escapeHtml(prayerTitle)}</h2>
            <h3 style="color: #666; margin-top: 12px;">Original Description</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${escapeHtml(prayerDescription)}</p>
            <h3 style="color: #666; margin-top: 12px;">Prayer</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${escapeHtml(prayerContent || 'No AI prayer generated.')}</p>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center;">This prayer requires manual review before it can be made publicly visible.</p>
        </div>
      `,
    });

    console.log(`[EMAIL] Moderation email sent to ${ADMIN_EMAIL} for prayer: ${prayerTitle}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send moderation email to ${ADMIN_EMAIL}:`, detail);
  }
}

export async function sendAdminPrayerCopyEmail(prayerTitle: string, prayerDescription: string, prayerContent: string, authorName: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    await client.send({
      to: ADMIN_EMAIL,
      from: { email: fromEmail, name: 'Pray For Change' },
      subject: `New Prayer Created: ${prayerTitle}`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a3728; text-align: center;">New Prayer Created</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">A new prayer has been submitted by <strong>${escapeHtml(authorName)}</strong>.</p>
          <div style="background-color: #f9f5f0; border-left: 4px solid #c9a96e; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #4a3728; margin-top: 0;">${escapeHtml(prayerTitle)}</h2>
            <h3 style="color: #666; margin-top: 12px;">Original Description</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${escapeHtml(prayerDescription)}</p>
            <h3 style="color: #666; margin-top: 12px;">Prayer</h3>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${escapeHtml(prayerContent || 'No AI prayer generated.')}</p>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center;">This is an automated admin notification from Pray For Change.</p>
        </div>
      `,
    });

    console.log(`[EMAIL] Admin prayer copy sent to ${ADMIN_EMAIL}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[EMAIL] Failed to send admin prayer copy to ${ADMIN_EMAIL}:`, detail);
  }
}

function buildCrisisPrayerHtml(
  subscriber: Subscriber,
  prayer: Prayer,
  prayerUrl: string,
  prayerCount: number,
  siteUrl: string
): string {
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;

  const rawImageUrl = prayer.imageUrl && !prayer.imageUrl.startsWith('data:') ? prayer.imageUrl : null;
  const absoluteImageUrl = rawImageUrl
    ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${siteUrl}${rawImageUrl}`)
    : null;
  const imageSection = absoluteImageUrl
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(absoluteImageUrl)}" alt="" style="display:block;width:100%;max-width:600px;height:auto;border-radius:6px 6px 0 0;" /></td></tr>`
    : '';

  const issueSection = prayer.description
    ? `<p style="font-size:16px;line-height:1.75;color:#374151;margin:0 0 24px;">${escapeHtml(prayer.description).replace(/\n/g, '<br />')}</p>`
    : '';

  const prayerSection = prayer.recitablePrayer
    ? `<div style="border-left:4px solid #c9a96e;padding:16px 20px;margin:0 0 28px;background:#fafaf8;">
         <p style="font-style:italic;font-size:16px;line-height:1.8;color:#4b5563;margin:0;">${escapeHtml(prayer.recitablePrayer).replace(/\n/g, '<br />')}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(prayer.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${imageSection}
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin:0 0 12px;">Daily Crisis Prayer</p>
              <h1 style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#111827;line-height:1.35;margin:0 0 24px;">${escapeHtml(prayer.title)}</h1>
              ${issueSection}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
              ${prayerSection}
              <div style="text-align:center;margin:0 0 16px;">
                <a href="${escapeHtml(prayerUrl)}" style="display:inline-block;background-color:#C94040;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;font-weight:700;padding:16px 36px;border-radius:50px;">I Prayed For This</a>
              </div>
              <p style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#9ca3af;margin:0 0 36px;">Join ${prayerCount.toLocaleString()} people praying</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#9ca3af;margin:0 0 8px;">PrayForChange.org &mdash; Every morning, a prayer for the world&#39;s most urgent crisis.</p>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#9ca3af;margin:0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const APPROVER_EMAIL = 'mrjackstafford@gmail.com';

export async function sendCrisisPrayerApprovalEmail(
  prayer: Prayer,
  approveUrl: string,
  rejectUrl: string
): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const siteUrl = process.env.SITE_URL || 'https://prayforchange.org';
    const rawImageUrl2 = prayer.imageUrl && !prayer.imageUrl.startsWith('data:') ? prayer.imageUrl : null;
    const absoluteImageUrl = rawImageUrl2
      ? (rawImageUrl2.startsWith('http') ? rawImageUrl2 : `${siteUrl}${rawImageUrl2}`)
      : null;
    const imageSection = absoluteImageUrl
      ? `<tr><td style="padding:0;"><img src="${escapeHtml(absoluteImageUrl)}" alt="" style="display:block;width:100%;max-width:600px;height:auto;border-radius:6px 6px 0 0;" /></td></tr>`
      : '';

    const descriptionSection = prayer.description
      ? `<div style="margin:0 0 24px;">
           <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#9ca3af;text-transform:uppercase;margin:0 0 8px;">The Issue</p>
           <p style="font-size:15px;line-height:1.75;color:#374151;margin:0;white-space:pre-wrap;">${escapeHtml(prayer.description)}</p>
         </div>`
      : '';

    const prayerSection = prayer.recitablePrayer
      ? `<div style="border-left:4px solid #c9a96e;padding:16px 20px;margin:0 0 28px;background:#fafaf8;">
           <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#9ca3af;text-transform:uppercase;margin:0 0 8px;">Prayer</p>
           <p style="font-style:italic;font-size:15px;line-height:1.8;color:#4b5563;margin:0;white-space:pre-wrap;">${escapeHtml(prayer.recitablePrayer)}</p>
         </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crisis Prayer Approval</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${imageSection}
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin:0 0 12px;">Daily Crisis Prayer — Approval Required</p>
              <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:700;color:#111827;line-height:1.35;margin:0 0 28px;">${escapeHtml(prayer.title)}</h1>
              ${descriptionSection}
              ${prayerSection}
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 28px;" />
              <p style="font-size:15px;color:#374151;margin:0 0 20px;">Click a button below to review before taking any action.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${escapeHtml(approveUrl)}" style="display:inline-block;background-color:#166534;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;">Review &amp; Approve</a>
                  </td>
                  <td>
                    <a href="${escapeHtml(rejectUrl)}" style="display:inline-block;background-color:#f3f4f6;color:#374151;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;border:1px solid #d1d5db;">Review &amp; Reject</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px;color:#9ca3af;margin:0;">Clicking a button shows a confirmation page before taking any action. Links expire in 48 hours.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">PrayForChange.org — Daily Crisis Prayer system</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await client.send({
      to: APPROVER_EMAIL,
      from: { email: fromEmail, name: 'PrayForChange.org' },
      subject: `Daily Crisis Prayer for approval: ${prayer.title}`,
      html,
    });

    console.log(`[APPROVAL] Approval email sent to ${APPROVER_EMAIL} for prayer: ${prayer.id}`);
  } catch (error: any) {
    const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
    console.error(`[APPROVAL] Failed to send approval email to ${APPROVER_EMAIL}:`, detail);
    throw error;
  }
}

export async function sendCrisisPrayerEmailBatch(
  subscribers: Subscriber[],
  prayer: Prayer,
  prayerUrl: string,
  prayerCount: number
): Promise<{ sent: number; failed: number }> {
  const SITE_URL = process.env.SITE_URL || 'https://prayforchange.org';
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;

  if (subscribers.length === 0) {
    console.log('[CRISIS] No active subscribers — send skipped');
    return { sent: 0, failed: 0 };
  }

  let client: typeof sgMail;
  let fromEmail: string;
  try {
    const creds = await getUncachableSendGridClient();
    client = creds.client;
    fromEmail = creds.fromEmail;
  } catch (err: any) {
    console.error('[CRISIS] Could not initialize SendGrid client:', err?.message || err);
    return { sent: 0, failed: subscribers.length };
  }

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (subscriber) => {
        const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribeToken}`;
        try {
          await client.send({
            to: subscriber.email,
            from: { email: fromEmail, name: 'PrayForChange.org' },
            subject: prayer.title,
            html: buildCrisisPrayerHtml(subscriber, prayer, prayerUrl, prayerCount, SITE_URL),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });
          console.log(`[CRISIS] Sent to ${subscriber.email}`);
          return true;
        } catch (error: any) {
          const detail = error?.response?.body ? JSON.stringify(error.response.body) : (error?.message || error);
          console.error(`[CRISIS] Failed to send to ${subscriber.email}:`, detail);
          return false;
        }
      })
    );
    for (const ok of results) {
      if (ok) sent++; else failed++;
    }
  }

  return { sent, failed };
}

const DAILY_PIPELINE_RECIPIENT = 'jackstaffmail@gmail.com';
const PIPELINE_SITE_URL = process.env.SITE_URL || 'https://prayforchange.org';

export async function sendDailyPrayerApprovalEmail(
  prayer: Prayer,
  approveUrl: string,
  rejectUrl: string,
  tierInfo?: { tier: number; confirmedOutlets: string[] }
): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const prayerSection = prayer.recitablePrayer
    ? `<div style="border-left:4px solid #c9a96e;padding:16px 20px;margin:0 0 28px;background:#fafaf8;">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#9ca3af;text-transform:uppercase;margin:0 0 8px;">Prayer</p>
         <p style="font-style:italic;font-size:15px;line-height:1.8;color:#4b5563;margin:0;white-space:pre-wrap;">${escapeHtml(prayer.recitablePrayer)}</p>
       </div>`
    : '';

  const summarySection = prayer.aiSummary
    ? `<div style="margin:0 0 20px;padding:12px 16px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#15803d;text-transform:uppercase;margin:0 0 6px;">Summary</p>
         <p style="font-size:14px;line-height:1.65;color:#166534;margin:0;">${escapeHtml(prayer.aiSummary)}</p>
       </div>`
    : '';

  const descriptionSection = prayer.description
    ? `<div style="margin:0 0 24px;">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#9ca3af;text-transform:uppercase;margin:0 0 8px;">The Issue</p>
         <p style="font-size:15px;line-height:1.75;color:#374151;margin:0;white-space:pre-wrap;">${escapeHtml(prayer.description)}</p>
       </div>`
    : '';

  const rawImageUrl3 = prayer.imageUrl && !prayer.imageUrl.startsWith('data:') ? prayer.imageUrl : null;
  const imageSection = rawImageUrl3
    ? `<div style="margin:0 0 24px;"><img src="${escapeHtml(rawImageUrl3.startsWith('http') ? rawImageUrl3 : `${PIPELINE_SITE_URL}${rawImageUrl3}`)}" alt="" style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;" /></div>`
    : '';

  const tierColors: Record<number, { bg: string; border: string; text: string; label: string }> = {
    1: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'Tier 1 — confirmed across 3+ regional outlet groups' },
    2: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'Tier 2 — confirmed across 2 outlet groups' },
    3: { bg: '#fefce8', border: '#fde68a', text: '#92400e', label: 'Tier 3 — limited cross-market confirmation' },
  };
  const tc = tierInfo ? (tierColors[tierInfo.tier] ?? tierColors[3]) : null;
  const tierSection = tierInfo && tc
    ? `<div style="margin:0 0 20px;padding:12px 16px;background:${tc.bg};border-radius:6px;border:1px solid ${tc.border};">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:${tc.text};text-transform:uppercase;margin:0 0 4px;">Story Validation</p>
         <p style="font-size:14px;color:${tc.text};margin:0 0 4px;">${tc.label}</p>
         ${tierInfo.confirmedOutlets.length ? `<p style="font-size:13px;color:${tc.text};margin:0;">Confirmed by: ${escapeHtml(tierInfo.confirmedOutlets.join(', '))}</p>` : ''}
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Daily Crisis Prayer Approval</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="padding:36px 40px 32px;">
          <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin:0 0 12px;">Automated Daily Crisis Prayer</p>
          <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:700;color:#111827;line-height:1.35;margin:0 0 16px;">${escapeHtml(prayer.title)}</h1>
          ${tierSection}
          ${summarySection}
          ${imageSection}
          ${descriptionSection}
          ${prayerSection}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
          <p style="font-size:15px;color:#374151;margin:0 0 20px;">Click a button below to review — no action is taken until you confirm.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr>
              <td style="padding-right:12px;"><a href="${escapeHtml(approveUrl)}" style="display:inline-block;background-color:#166534;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;">Review &amp; Approve</a></td>
              <td><a href="${escapeHtml(rejectUrl)}" style="display:inline-block;background-color:#f3f4f6;color:#374151;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;border:1px solid #d1d5db;">Review &amp; Reject</a></td>
            </tr>
          </table>
          <p style="font-size:12px;color:#9ca3af;margin:0;">These links open a confirmation page before taking any action. They expire in 48 hours.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">PrayForChange.org &mdash; Automated daily pipeline</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await client.send({
    to: DAILY_PIPELINE_RECIPIENT,
    from: { email: fromEmail, name: 'PrayForChange.org' },
    subject: `[Prayer pending] ${prayer.title}`,
    html,
  });

  console.log(`[DAILY-PIPELINE] Approval email sent to ${DAILY_PIPELINE_RECIPIENT} for: ${prayer.title}`);
}

export async function sendDailyPrayerPublishedEmail(
  prayer: Prayer,
  prayerUrl: string,
  tierInfo?: { tier: number; confirmedOutlets: string[] }
): Promise<void> {
  const { client, fromEmail } = await getUncachableSendGridClient();

  const prayerSection = prayer.recitablePrayer
    ? `<div style="border-left:4px solid #c9a96e;padding:16px 20px;margin:0 0 28px;background:#fafaf8;">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#9ca3af;text-transform:uppercase;margin:0 0 8px;">Prayer</p>
         <p style="font-style:italic;font-size:15px;line-height:1.8;color:#4b5563;margin:0;white-space:pre-wrap;">${escapeHtml(prayer.recitablePrayer)}</p>
       </div>`
    : '';

  const rawImageUrl = prayer.imageUrl && !prayer.imageUrl.startsWith('data:') ? prayer.imageUrl : null;
  const imageSection = rawImageUrl
    ? `<div style="margin:0 0 24px;"><img src="${escapeHtml(rawImageUrl.startsWith('http') ? rawImageUrl : `${PIPELINE_SITE_URL}${rawImageUrl}`)}" alt="" style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;" /></div>`
    : '';

  const tierColors: Record<number, { bg: string; border: string; text: string; label: string }> = {
    1: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', label: 'Tier 1 — confirmed across 3+ regional outlet groups' },
    2: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'Tier 2 — confirmed across 2 outlet groups' },
    3: { bg: '#fefce8', border: '#fde68a', text: '#92400e', label: 'Tier 3 — limited cross-market confirmation' },
  };
  const tc = tierInfo ? (tierColors[tierInfo.tier] ?? tierColors[3]) : null;
  const tierSection = tierInfo && tc
    ? `<div style="margin:0 0 20px;padding:12px 16px;background:${tc.bg};border-radius:6px;border:1px solid ${tc.border};">
         <p style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:${tc.text};text-transform:uppercase;margin:0 0 4px;">Story Validation</p>
         <p style="font-size:14px;color:${tc.text};margin:0 0 4px;">${tc.label}</p>
         ${tierInfo.confirmedOutlets.length ? `<p style="font-size:13px;color:${tc.text};margin:0;">Confirmed by: ${escapeHtml(tierInfo.confirmedOutlets.join(', '))}</p>` : ''}
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Daily Crisis Prayer Published</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="padding:36px 40px 32px;">
          <p style="font-size:13px;font-weight:600;letter-spacing:0.08em;color:#166534;text-transform:uppercase;margin:0 0 12px;">✓ Published — Daily Crisis Prayer</p>
          <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:700;color:#111827;line-height:1.35;margin:0 0 16px;">${escapeHtml(prayer.title)}</h1>
          ${tierSection}
          ${imageSection}
          ${prayerSection}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />
          <a href="${escapeHtml(prayerUrl)}" style="display:inline-block;background-color:#166534;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:6px;margin-bottom:20px;">View Live Prayer →</a>
          <p style="font-size:12px;color:#9ca3af;margin:0;">This prayer is now live and visible to the community on PrayForChange.org.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
          <p style="font-size:12px;color:#9ca3af;margin:0;">PrayForChange.org &mdash; Automated daily pipeline</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await client.send({
    to: DAILY_PIPELINE_RECIPIENT,
    from: { email: fromEmail, name: 'PrayForChange.org' },
    subject: `[Published] ${prayer.title}`,
    html,
  });

  console.log(`[DAILY-PIPELINE] Published notification sent to ${DAILY_PIPELINE_RECIPIENT} for: ${prayer.title}`);
}

export async function sendDailyPrayerErrorEmail(errorMessage: string, stepName: string): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const today = new Date().toISOString().split('T')[0];
    await client.send({
      to: DAILY_PIPELINE_RECIPIENT,
      from: { email: fromEmail, name: 'PrayForChange.org' },
      subject: `[Daily prayer pipeline ERROR] ${today} — ${stepName}`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;padding:32px;">
  <h2 style="color:#dc2626;margin:0 0 16px;">Daily Prayer Pipeline Failed</h2>
  <p style="color:#374151;margin:0 0 12px;"><strong>Step:</strong> ${escapeHtml(stepName)}</p>
  <p style="color:#374151;margin:0 0 12px;"><strong>Date:</strong> ${today}</p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin:0 0 16px;">
    <pre style="margin:0;font-size:13px;color:#991b1b;white-space:pre-wrap;word-break:break-word;">${escapeHtml(errorMessage)}</pre>
  </div>
  <p style="color:#6b7280;font-size:13px;">No prayer was drafted or sent today. You may want to create one manually.</p>
</body></html>`,
    });
    console.log(`[DAILY-PIPELINE] Error email sent to ${DAILY_PIPELINE_RECIPIENT}`);
  } catch (err: any) {
    console.error('[DAILY-PIPELINE] Failed to send error email:', err?.message || err);
  }
}

export async function sendNoPrayerDraftedEmail(): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const today = new Date().toISOString().split('T')[0];
    await client.send({
      to: DAILY_PIPELINE_RECIPIENT,
      from: { email: fromEmail, name: 'PrayForChange.org' },
      subject: `[Daily prayer] No crisis found today — ${today}`,
      html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;padding:32px;">
  <h2 style="color:#92400e;margin:0 0 16px;">No Prayer Drafted Today</h2>
  <p style="color:#374151;margin:0 0 12px;">The daily pipeline ran on <strong>${today}</strong> but found no crisis that met the threshold — either all candidates were too similar to recent prayers, or no articles were returned.</p>
  <p style="color:#374151;margin:0;">No email was sent to subscribers today. You may want to create one manually if there's an important story.</p>
</body></html>`,
    });
    console.log(`[DAILY-PIPELINE] No-prayer-drafted email sent to ${DAILY_PIPELINE_RECIPIENT}`);
  } catch (err: any) {
    console.error('[DAILY-PIPELINE] Failed to send no-prayer email:', err?.message || err);
  }
}
