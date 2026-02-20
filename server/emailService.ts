import sgMail from '@sendgrid/mail';

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

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

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
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for signing up to use Pray For Change. We're glad to have you as part of our community of prayer.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            You can now create prayer requests, join others in prayer, and be part of a supportive community that believes in the power of prayer.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Blessings,<br/>
            The Pray For Change Team
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Welcome email sent to ${toEmail}`);
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send welcome email to ${toEmail}:`, error?.message || error);
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
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Your prayer request has been saved. Here is a copy for your records:
          </p>
          <div style="background-color: #f9f5f0; border-left: 4px solid #c9a96e; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #4a3728; margin-top: 0;">${prayerTitle}</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555; white-space: pre-wrap;">${prayerContent}</p>
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
    console.error(`[EMAIL] Failed to send prayer saved email to ${toEmail}:`, error?.message || error);
  }
}

export async function sendDailyDigestEmail(toEmail: string, firstName: string, prayerDigests: { title: string; newCount: number; totalCount: number }[]) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const prayerRows = prayerDigests.map(p => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; color: #333;">${p.title}</td>
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
          <p style="font-size: 16px; line-height: 1.6; color: #333;">Dear ${firstName},</p>
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
    console.error(`[EMAIL] Failed to send daily digest to ${toEmail}:`, error?.message || error);
  }
}
