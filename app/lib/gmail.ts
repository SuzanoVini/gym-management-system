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
    maxResults: 50,
  });

  return res.data.messages ?? [];
}

export async function getZenPlannerCancellationEmails() {
  const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client() });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:messages-noreply@zenplanner.com subject:"A Membership Was Cancelled"',
    maxResults: 50,
  });

  return res.data.messages ?? [];
}

export async function getZenPlannerHoldEmails() {
  const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client() });

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:messages-noreply@zenplanner.com subject:"A Membership Was Placed on Hold"',
    maxResults: 50,
  });

  return res.data.messages ?? [];
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  const decode = (data: string) => Buffer.from(data, 'base64').toString('utf-8');

  // Recursively search MIME parts — prefer text/plain, fall back to text/html
  const findPart = (parts: typeof payload.parts, mime: string): string | null => {
    if (!parts) {
      return null;
    }
    for (const part of parts) {
      if (part.mimeType === mime && part.body?.data) {
        return decode(part.body.data);
      }
      if (part.parts) {
        const found = findPart(part.parts, mime);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  if (payload.parts) {
    const plain = findPart(payload.parts, 'text/plain');
    if (plain) {
      return htmlToPlainText(plain);
    }

    const html = findPart(payload.parts, 'text/html');
    if (html) {
      return htmlToPlainText(html);
    }
  }

  if (payload.body?.data) {
    return htmlToPlainText(decode(payload.body.data));
  }

  return '';
}
