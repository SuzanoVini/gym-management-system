/**
 * One-time script to obtain a Gmail OAuth refresh token.
 *
 * Run once:
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/gmail-auth.mjs
 *
 * Then add the printed GMAIL_REFRESH_TOKEN to your .env.local and Vercel env vars.
 */

import { createInterface } from 'readline';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET before running this script.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify'],
  prompt: 'consent',
});

console.log('\nOpen this URL in your browser (use the owner@example.com account):\n');
console.log(authUrl);
console.log();

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());

    console.log('\nSuccess! Add these to your .env.local and Vercel environment variables:\n');
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    console.error('\nFailed to exchange code for tokens:', err.message);
  }
});
