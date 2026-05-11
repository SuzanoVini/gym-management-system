import { google } from 'googleapis';

function getOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  if (process.env.GMAIL_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  }
  return client;
}

export async function getZenPlannerBookingEmails() {
  const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client() });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:messages-noreply@zenplanner.com subject:"New Appointment Scheduled"',
    maxResults: 20,
  });

  return res.data.messages ?? [];
}

export async function getEmailTextBody(messageId: string): Promise<string> {
  const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client() });

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const payload = res.data.payload;
  if (!payload) {
    return '';
  }

  // Recursively find text/plain part
  const findPlainText = (parts: typeof payload.parts): string | null => {
    if (!parts) {
      return null;
    }
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const found = findPlainText(part.parts);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  if (payload.parts) {
    const text = findPlainText(payload.parts);
    if (text) {
      return text;
    }
  }

  // Non-multipart message
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return '';
}
