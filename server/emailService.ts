import sgMail from '@sendgrid/mail';

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
            <h3 style="color: #666; margin-top: 12px;">AI-Generated Prayer</h3>
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
            <h3 style="color: #666; margin-top: 12px;">AI-Generated Prayer</h3>
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
