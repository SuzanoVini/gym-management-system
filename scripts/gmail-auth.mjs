/**
 * One-time script to obtain a Gmail OAuth refresh token.
 *
 * Run:
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/gmail-auth.mjs
 *
 * A browser window will open. After authorizing, the refresh token is printed here.
 */

import { createServer } from 'node:http';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET before running this script.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify'],
  prompt: 'consent',
});

console.log("\nOpen this URL in your browser (sign in with the gym's shared inbox account):\n");
console.log(authUrl);
console.log('\nWaiting for authorization...\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');

  if (!code) {
    res.end('No code received.');
    return;
  }

  res.end('<h2>Authorization successful! You can close this tab.</h2>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Success! Add these to your .env.local and Vercel environment variables:\n');
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('Failed to exchange code for tokens:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} for the OAuth callback...`);
});
