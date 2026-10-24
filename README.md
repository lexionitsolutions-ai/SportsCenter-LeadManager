# Sports Centre Lead Manager

A minimal staff app for enquiries, Google Sheets storage, WhatsApp drafts, and dated follow-ups.

## GitHub Pages

Repository: [SportsCenter-LeadManager](https://github.com/lexionitsolutions-ai/SportsCenter-LeadManager).

Site address after deployment: https://lexionitsolutions-ai.github.io/SportsCenter-LeadManager/

The Pages workflow runs checks and publishes only index.html, style.css, script.js, and assets. Pushes to main redeploy the site automatically. The spreadsheet and staff access code stay in Apps Script; do not commit the access code. Pages serves the frontend, and the configured Apps Script URL handles Sheets reads and writes.

## Connect your existing script URL - one-time setup

The supplied URL is already configured as `API_URL` in `script.js`:

[Sports Centre deployment](https://script.google.com/macros/s/AKfycbxKL-uC53lSZCHTMwSUYcgNJIlT7CsxgTaMRSy9wIBmgUsoEWxjBMEb5lN9sySXlbVr/exec)

1. Open the Google Sheet that should hold your leads. Choose **Extensions > Apps Script** and replace its Code.gs with this folder's updated **Code.gs**.
2. Run **setup** from the Apps Script editor and authorise it. It creates the Leads tab, stores the spreadsheet ID, sets India time, and generates a staff access code. Existing lead rows are preserved. Re-running setup preserves an existing access code.
3. Open **Project Settings > Script Properties** and copy the value of **API_KEY**. This is the staff access code. Give it only to staff who should access all leads. Do not paste it into public source code or the deployment URL.
4. For the app at the script URL, add or replace the HTML file named **App** with all of **App.html**. This file includes the current frontend and embedded logo.
5. Choose **Deploy > Manage deployments > Edit** on the existing deployment. Set **Execute as: Me**, **Who has access: Anyone**, and **Version: New version**, then click **Deploy**. Editing the existing deployment keeps your supplied URL. Anyone access allows the HTTP endpoint to receive browser requests; the server still requires the staff access code before returning or changing any lead data.
6. Open **index.html** (or the deployed script URL), enter the staff access code, and press **Connect**. The header must say **Google Sheets connected**. Save an enquiry and confirm a row appears in the Leads tab. Then update its follow-up and confirm the date and history change.

You must publish the updated backend: adding a script URL to a local file cannot change code already deployed on Google's servers. If your account does not offer Anyone access, use an organisation-approved authenticated host/API instead; this direct browser POST configuration requires anonymous HTTP requests protected by the staff code.

The HTTP handler and response use Google's [Web Apps](https://developers.google.com/apps-script/guides/web) and [Content Service](https://developers.google.com/apps-script/guides/content) interfaces.

## How saving works

- **index.html** sends URL-encoded POST requests to the supplied script URL. **Code.gs / doPost** authenticates the staff code and reads or writes the Google Sheet. The Google-hosted App.html uses google.script.run against the same handler.
- There is **no browser-only demo saving or automatic local fallback**. A saved message appears only after the backend confirms the write. A failed request keeps the form, and retrying the same request does not create a duplicate.
- The staff code is held in memory and, where supported, sessionStorage for the current browser tab. Use **Staff access** to change it. Staff code access is shared access: follow-up history labels these updates as Staff access code, rather than claiming an individual staff identity.
- Previously saved demo entries are not imported automatically. Production starts with the contents of your Leads sheet.

## Staff workflow

**Enquiries:** Enter name, Indian mobile number, service from the dropdown, follow-up date, source, and optional notes. After saving, a small popup offers **Send WhatsApp message** or **Cancel**. Send opens the prefilled introduction in WhatsApp, where you can review and send it. Cancel closes the popup and keeps the saved enquiry. The draft includes the service, supplied temporary Zenith Fitness website URL, and Sports Centre Instagram URL. No message is sent automatically.

**Follow-ups:** Filter Today, Yesterday, Tomorrow, Overdue, All open, Converted, or All leads; search by name, number, or service. A specific date overrides the date/status buttons and shows open leads scheduled for that date. Clear returns to Today.

**Update:** Record a required reason and next date. Converted, Not interested, and Wrong number close the lead and clear its next date. Reopen a lead under All leads by selecting an open status and a next date. Previous follow-ups remain in history.

## Files

| File | Purpose |
| --- | --- |
| index.html / style.css / script.js | Local or static-hosted frontend, connected directly to Sheets |
| Code.gs | Authenticated HTTP endpoint and Google Sheets backend |
| App.html | Single-file frontend for Google Apps Script hosting |
| assets/sports-centre-logo.svg | Vector recreation of the supplied SC shield |
| build.py | Rebuild App.html after frontend changes |
| test.cjs | Core and backend tests with an in-memory Sheets mock |
| transport.test.cjs | HTTP transport and save-confirmation tests |

After changing the frontend, run `python build.py` and replace App in the script editor if using Google-hosted UI. After backend changes, replace Code.gs. Publish a new version of the existing deployment.

## Troubleshooting

- **Enter the correct staff access code:** run setup, check API_KEY in Script Properties, and re-enter it with Staff access.
- **Page instead of JSON / script function not found:** the deployment still has old code, or requires a Google login for its HTTP endpoint. Replace Code.gs and publish a new version with the settings above.
- **Run setup first:** run setup in the spreadsheet-bound editor, then retry.
- **Failed to fetch / HTTP error:** check connection, script URL, deployment access, and whether your organisation blocks anonymous Apps Script access. Serve the folder using `python -m http.server 8080` and open `http://localhost:8080` if file-origin restrictions apply. No request uses no-cors because that would hide the save result.
- **Another team member updated this lead:** close the update window, refresh, and review the latest history before trying again.

Keep the Leads header names and order intact. Avoid manual edits to JSON history/service columns or blank rows. Use spreadsheet copies or Sheets version history for backups. History is stored with its lead in one row; an explicit error is returned before the history approaches the cell limit. There is no background messaging or polling; Refresh loads teammates' changes.

## Verification

Run `node --check script.js`, `node test.cjs`, and `node transport.test.cjs`. Tests cover authenticated HTTP reads/creates/updates, invalid access codes, validation, history, duplicate retries, conflicts, request formatting, successful-save acknowledgement, and keeping the form after failed saves. They mock Sheets and HTTP; a real write still requires the one-time deployment steps and live test above. Browser visual verification was unavailable in this session.
