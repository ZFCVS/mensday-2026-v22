# Good Men Studio — V22 — GitHub Pages release

This is the original V22 static application, packaged for GitHub Pages. No Netlify account or hosting is required.

## Public repository and URL

- GitHub account: `ZFCVS`
- Recommended repository: `Mensday_V22`
- Published home page: https://zfcvs.github.io/Mensday_V22/
- Character studio: https://zfcvs.github.io/Mensday_V22/block-figure.html

## Publish using the GitHub website

1. Create a **public** repository named `Mensday_V22` under `ZFCVS`.
2. Unzip this archive locally. Upload **all of its contents**, not the ZIP itself or an extra enclosing folder. Keep the `src/` and `assets/` directories intact.
3. Commit the uploaded files to `main`.
4. Go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, `main`, and `/(root)`, then **Save**.
5. Once the Pages deployment succeeds, open the public home-page link above in an incognito window.

## QR and sharing

The app derives its share URL from the actual page address; no Netlify URL or configuration is needed. The optional 'Phone-accessible app URL' field can be left blank on GitHub Pages. If an old URL was manually entered in the share settings, clear it so the GitHub Pages address is used.

Shared cards embed card data in the link and its QR code. Anyone who has the link can view it. Sharing an email attachment and rich-text hyperlinks depends on the recipient's email client. The download counter is per browser/device, not a global total.

## Limitations / verification

GitHub Pages provides static hosting only. This release does not include a server-side database, private access controls, or global usage analytics. The local static-file checks confirm that referenced assets and module imports are bundled; QR scanning, native sharing, PNG/GIF export and mobile/Outlook behavior still require browser/device acceptance testing after deployment.

## Organizational approval

This repository includes company logos, brand fonts and other creative assets. Public hosting makes these assets downloadable. Confirm that corporate information-security and brand permissions cover publication before using it publicly.

## GitHub Pages V22 QR + email update

QR codes generated on the public `https://zfcvs.github.io/Mensday_V22/` deployment are locked to this GitHub origin, preventing a stale manually stored Netlify URL from being used. The QR display on the PNG/GIF card has been enlarged from 280 to 320 pixels. It links to the personalized card; the full card state is carried after `#gms=` and stays client-side. These QR codes are **not short URLs**; the website does not run a server or shortening database.

The email contains a short, human-readable link labelled **Create a card for someone else**, pointing to the public website homepage: `https://zfcvs.github.io/Mensday_V22/`. The native share plain-text body includes the same public link for clients that strip rich formatting. Users should copy/paste the formatted email from the sharing dialog to obtain actual clickable labels in email clients supporting HTML.

Acceptance test: (1) make a new personalized card, (2) download the card PNG, (3) scan the QR with a second phone using its camera (not the same phone displaying the card), (4) check the personalized recipient/message on the opened URL, (5) copy formatted email to Outlook and check both links, (6) test PNG/GIF and mobile. Existing exported cards cannot be retroactively fixed.

## 12 November layout hotfix — QR collision

The prior change enlarged the QR to 320 px at y=1080, which overlapped the five personality scores and message heading. The new code draws the QR at (762, 1140) with size 254 px, centered in the right-hand message lane; its caption is centered at x=889, y=1410. No personality-score or greeting text rendering was moved. PNG and GIF use the same `paintShareCard` renderer. The native share message includes BOTH `View your card` and `Create a card for someone else` links along with the greeting; the formatted email copy already contains both clickable anchor labels. Note: browser/OS share sheets control whether attached files and HTML formatting appear in email clients. Full personalized card URLs cannot be made genuinely short without a backend token service.

## User interaction update (V22)
- Next on the first step opens a field-specific prompt for missing recipient/sender names and explains how many qualities remain.
- Five quality sliders must each be interacted with before the character selection step. Ratings can be returned to 50.
- When a character is selected, the user is invited to explore the left-hand controls. A reminder before the card step offers an explicit continue-unchanged option.
- Existing GitHub QR and two-link email behavior is retained from the previous release.


## Outlook email fallback (12 November 2026)
Windows Share may display a permanent loading state while enumerating Outlook targets. The primary workflow is now: Copy email with labelled links → Open Outlook email draft → Paste formatted email → Download PNG and GIF → Attach both manually. The native Windows Share button is retained as an optional fallback. Public static hosting cannot attach locally generated files directly to Outlook.
