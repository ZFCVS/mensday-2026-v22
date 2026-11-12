# V22 security-hardening candidate — NOT security certified

## Code changes
- Fixed QR/email canonical URL for `/mensday-2026-v22/` and legacy `/Mensday_V22/`, and only allows approved ZFCVS GitHub origins.
- Removed arbitrary external URL overrides and old saved override; production QR URLs resolve from the actual approved route.
- Restricted token size and decompressed payload size; validated names, greeting, quality scores and camera values.
- Removed persistent browser draft saves; **Save settings JSON** remains a manual download. Previous draft/URL storage keys are cleared at load.
- Added restrictive script CSP and referrer meta tags. These are defense in depth, **not** a substitute for server-side framing headers.
- Added browser-visible warning about shareable personal data.

## Important architectural limits
1. **No risk-free certification**: name, message and scores remain inside reversible share links. A holder of the link can read the card. The architecture provides no revocation, expiry or recipient authentication. Do not use sensitive employee data. If confidential access is required, replace stateless links with a ZF-approved authenticated API and per-card short tokens.
2. **GitHub Pages cannot apply the included `_headers` file**. It is supplied only as a reference for compatible hosting. Meta CSP cannot enforce `frame-ancestors`; the public GitHub deployment must not be represented as having the HTTP security headers in this file.
3. Posting a GitHub Pages URL to SharePoint does **not** make GitHub hosting private. To restrict access to ZF employees, deploy on approved internal infrastructure/SPFx or an identity-protected site, with security and font/IP sign-off.
4. The existing card links with `#gms=` remain shareable; private data should not be placed there.
5. Corporate cyber review must verify: exact original two findings, response headers, content security policy compatibility, QR on real devices, card export, malformed tokens, Outlook copy+paste, pen test, brand/font rights, and tenant policy for SharePoint.

## Deployment
- **GitHub Pages (public pilot only)**: extract the package and upload contents into `ZFCVS/mensday-2026-v22`, preserving `src/` and `assets/`. The `_headers` file is ignored here.
- **SharePoint for company-wide use**: link to the GitHub Pages site only if public external hosting and disclosure are approved. For internal-only deployment, arrange a vetted SPFx/SharePoint hosting implementation; do not assume that uploading this raw HTML ZIP to a SharePoint document library creates a compliant web application.
- Clear cache/try InPrivate after update. Verify `View your card` and `Create a card for someone else` point to the correct current host.
