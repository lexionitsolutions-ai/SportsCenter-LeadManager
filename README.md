# Sports Centre Lead Manager

A simple enquiry and follow-up app. It connects to Google Sheets automatically with no staff code or login prompt.

[Open website](https://lexionitsolutions-ai.github.io/SportsCenter-LeadManager/) | [Repository](https://github.com/lexionitsolutions-ai/SportsCenter-LeadManager)

## Apply the public-access backend update

1. Open the Google Sheet's **Extensions > Apps Script** and replace **Code.gs** with this repository's latest Code.gs.
2. If SPREADSHEET_ID is not configured, run **setup** once. Existing lead rows are preserved.
3. If using the Google-hosted interface too, replace the HTML file named **App** with the current **App.html**.
4. Choose **Deploy > Manage deployments > Edit > New version > Deploy**. Keep **Execute as: Me** and **Who has access: Anyone**. Edit the existing deployment so the script URL remains unchanged.
5. Refresh the website. Check for **Google Sheets connected**, submit a test enquiry, and check its row in Leads.

GitHub Pages publishes the frontend only. Code.gs must be redeployed separately on Google. If the website reports that the deployed script still requires a code, step 4 has not yet published the latest backend.

## Access

As explicitly requested, anyone who can reach the script URL can read, create, or update leads. There is no API key, account allowlist, or login check. History records the actor as Staff because identities are not verified. API_KEY and ALLOWED_EMAILS properties from older versions are unused. Old access codes saved in browsers are removed automatically. Deletion is not supported.

## Staff workflow

- **Enquiries:** Enter name, Indian mobile number, service, follow-up date, source, and optional requirements. After saving, choose **Send WhatsApp message** or **Cancel**. Send opens the prefilled WhatsApp draft; a person sends it. Cancel keeps the enquiry saved.
- **Follow-ups:** Filter by Today, Yesterday, Tomorrow, Overdue, All open, Converted, or All leads. Search by name, number, or service. An exact date shows open leads for that date. Clear returns to Today.
- **Update:** Record the reason and next date. Converted, Not interested, and Wrong number close the lead and clear its next date. All leads includes closed records for reopening. Previous follow-ups remain in history.

Saved messages appear only after the server confirms the write. There is no browser-only fallback. Failed saves keep the form and retry identifier so repeated requests do not duplicate the same entry.

## Maintenance

The Pages workflow tests and publishes index.html, style.css, script.js, and assets after pushes to main. Run `python build.py` to rebuild the Google-hosted App.html after frontend edits.

Keep Leads headers intact and avoid manual edits to JSON columns. Back up with spreadsheet copies or Sheets version history. Refresh loads teammates' changes. Stale updates are rejected: refresh and review the latest history before retrying. There is no automatic polling, scheduled reminder service, or automatic WhatsApp delivery. History is stored with its lead; an explicit error is returned before reaching the cell limit.

The SC logo asset is a vector recreation of the supplied shield. App.html embeds it for Google hosting.

## Verification

Run `node --check script.js`, `node test.cjs`, and `node transport.test.cjs`. Tests cover public HTTP reads/creates/updates, validation, history, duplicates, stale-update checks, confirmed saves, and preserved forms after failures. Tests mock Sheets and HTTP; a real sheet write still requires the deployment steps above.
