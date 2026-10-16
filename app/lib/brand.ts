// app/lib/brand.ts
// Gym branding comes from env vars so the public repo ships no logos or names.
// See public/brand/README.md for how to add yours.
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Gym Ops',
  // Shorter form for the browser tab title. Defaults to the full name.
  shortName:
    process.env.NEXT_PUBLIC_BRAND_SHORT_NAME || process.env.NEXT_PUBLIC_BRAND_NAME || 'Gym Ops',
  // Wide logo for the header and login page. Empty shows a text wordmark instead.
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '',
  // Round badge beside the payroll header title. Empty hides it.
  badgeUrl: process.env.NEXT_PUBLIC_BRAND_BADGE_URL || '',
  // Browser tab icon. Empty falls back to public/icon.svg.
  iconUrl: process.env.NEXT_PUBLIC_BRAND_ICON_URL || '',
  // Legal name on the first row of the accountant's payroll export.
  companyName: process.env.NEXT_PUBLIC_PAYROLL_COMPANY_NAME || 'Your Company Inc.',
};
