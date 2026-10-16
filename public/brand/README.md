# Your logo goes here

The app ships without any gym's branding. Until you add yours, it shows the name from
`NEXT_PUBLIC_BRAND_NAME` (default "Gym Ops") as a text wordmark.

## Add your branding

1. Put your images in this folder (they're gitignored, so they never get committed):
   - a wide logo for the header and login page, e.g. `logo.png` (about 220×48)
   - optionally a round badge for the payroll header, e.g. `badge.png` (80×80)
   - optionally a browser tab icon, e.g. `icon.png`
2. Point the app at them in `.env.local`:

   ```env
   NEXT_PUBLIC_BRAND_NAME=Your Gym
   NEXT_PUBLIC_BRAND_SHORT_NAME=Your Gym   # optional, for the browser tab title
   NEXT_PUBLIC_BRAND_LOGO_URL=/brand/logo.png
   NEXT_PUBLIC_BRAND_BADGE_URL=/brand/badge.png
   NEXT_PUBLIC_BRAND_ICON_URL=/brand/icon.png
   NEXT_PUBLIC_PAYROLL_COMPANY_NAME=Your Gym Inc.
   ```

3. Restart `npm run dev`.

## When deploying

Files in this folder aren't committed, so a deployed build can't see them. Host the images
somewhere public (for example a public Supabase Storage bucket) and set the same variables in
your host's environment settings, using full `https://` URLs.
