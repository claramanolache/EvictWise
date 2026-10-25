# Evict Wise

Evict Wise is an Expo / React Native app for organizing eviction-related documents, understanding housing questions, tracking deadlines, and preparing information to discuss with a legal professional. It uses Expo Router, Redux Toolkit, OpenAI, and a local Express API for Google Cloud Translation.

The assistant provides legal information and can make mistakes. Verify extracted dates, summaries, translations, and legal information against your documents and a qualified professional.

## Run locally

Use Node.js 22.13 or newer (the account service uses built-in `node:sqlite`), npm, an OpenAI API key, and a Google Cloud project configured for Cloud Translation with Application Default Credentials.

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```dotenv
   EXPO_PUBLIC_OPENAI_API_KEY=your-development-key
   # Optional; defaults to http://localhost:3001
   # EXPO_PUBLIC_TRANSLATION_API_URL=http://localhost:3001
   ```

3. If `server/.env` does not already exist, copy `server/.env.example` to it. Set your project and browser origin:

   ```dotenv
   GOOGLE_CLOUD_PROJECT=your-google-cloud-project
   PORT=3001
   CLIENT_ORIGIN=http://localhost:8081
   ```

   Configure Google Application Default Credentials for that project. If using a credentials file, keep it outside the repository and configure `GOOGLE_APPLICATION_CREDENTIALS` for the server. No Google credentials belong in an `EXPO_PUBLIC_` variable.

4. Start the web app:

   ```bash
   npm run web
   ```

   Alternatively, `npm start` opens the Expo development workflow. Both commands run `scripts/start-development.cjs`: it checks the translation API, starts the default local API if needed, waits for its health endpoint, and then starts Expo. An existing API is reused only after the account session endpoint is also checked. An older translation-only server is rejected with instructions to restart the API. Ctrl+C stops processes launched by this script, leaving an independently running API alone.

If `EXPO_PUBLIC_TRANSLATION_API_URL` is set, that service must already be running. Startup reports an error if it cannot reach it; it does not start a replacement server. The automatically launched default API uses port 3001.

For an IDE that launches Expo directly, or a separately hosted API:

```bash
npm run server
```

`npx expo start` bypasses the combined startup script, so the API must be started separately. `npm run ios` and `npm run android` invoke Expo's native build commands and also require a separately reachable translation service. On a physical device, configure the API URL with the development computer's reachable LAN address instead of `localhost`. Restart Expo after changing public environment variables. If Expo uses another web port, update `CLIENT_ORIGIN` and restart the API.

## Using the app

### Welcome and accounts

New visitors see a three-step welcome flow:

1. **Language:** choose the preferred language before reading the introduction.
2. **About the app:** a short illustrated overview of documents, deadlines, chat, and local legal help.
3. **Your account:** create an account with a username, password, and password confirmation. Returning users can choose Sign in.

After registration or sign-in, **Profile** is the first app screen. The root `/` route also redirects to Profile; chat is now `/chat`. Protected routes are unavailable while signed out. Profile shows the username and a Sign out action. The old starter-menu component is retained under `src/components/StarterMenu.tsx` rather than exposed as a route.

On the first Profile visit for an account on this browser, a guided tour displays pointer bubbles over the upload button and navigation menu. It explains uploading the eviction notice and lease, profile/supporting files and the case summary, Chat/Translate, Calendar/checklist, and Lawyer Connect. After Calendar, a **Sample reminder** step sends one local demo notification when the user presses Next into that step; there is no separate notification button. It requests permission if needed, labels the sample as a tutorial example rather than a real deadline, and displays an in-app preview if permission is denied or system notifications are unavailable. Browser notifications use the Web Notifications API; Android/iOS use Expo local notifications with foreground display and default sound (subject to device settings). Going Back does not send another ping, and skipping/leaving before permission resolves cancels delivery. It does not add calendar events or cancel existing reminders. The tour opens the menu for its navigation steps, tracks the highlighted controls as the layout changes, and returns to the upload button at the end. Use Next, Back, Skip tour, or Start planning. Completing or skipping stores `firstTime: false` in the account's local profile, so it does not repeat on later visits in the same browser. The text follows the selected language.

Usernames are case-insensitive and use 3–32 letters, numbers, or underscores. New passwords require 9–128 characters, allow spaces and Unicode, and are never truncated. Account recovery/password reset and email verification are not implemented; keep the credentials available.

The account API runs alongside translation on the Express server. Restart an already-running API after updating to this version. `EXPO_PUBLIC_AUTH_API_URL` optionally selects a separate account API; otherwise it uses `EXPO_PUBLIC_TRANSLATION_API_URL` or `http://localhost:3001`.

### Password and session storage

Passwords are hashed on the server with **scrypt** (`N=131072`, `r=8`, `p=1`, 64-byte output), with a random 16-byte salt for each password. Verification uses a timing-safe comparison. This follows the [OWASP scrypt password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html); passwords are not stored in plaintext or reversibly encrypted.

Accounts, salted hashes, hashed session tokens, and throttling records live in `server/private/accounts.sqlite3`. The private directory is created with owner-only access and the database with mode `0600`; the directory and database journals are excluded from Git. This database is separate from the public lawyer directory. Set `AUTH_DATABASE_PATH` to an absolute path outside the web bundle to use a different private storage location. Protect and back up this file as credential data; it is not an encrypted-at-rest database.

Web sessions use a seven-day HttpOnly, SameSite=Lax cookie. Session tokens are random; only their SHA-256 hashes are stored by the server. Logout revokes the active session. Native clients keep the token in memory, so a new launch requires signing in again. No password or session token is stored in Redux or browser localStorage. The app rechecks sessions on activation and periodically.

The API validates credentials, uses parameterized SQL, limits attempts by IP and username, limits concurrent password hashing, and rejects cross-origin writes and non-JSON requests. For deployment, set `NODE_ENV=production` and serve the app/API over HTTPS: authentication rejects insecure requests and cookies become Secure. If behind a trusted TLS-terminating proxy, configure `TRUST_PROXY_HOPS` to its exact hop count and prevent direct access that could spoof forwarded headers. The default SameSite cookie setup expects a same-site app/API deployment. Local HTTP is for development only.


### Navigation and appearance

The hamburger menu contains **Chat**, **Profile**, **Case Status**, **Calendar**, and **Lawyer Connect**, with icons and a highlighted current page. On desktop, the expanded sidebar takes its own space and the chat resizes. On narrow screens, it opens over the page with a dismissible backdrop.

The compact top-right switch changes light/dark mode. The app initially follows the system theme unless a saved preference exists. Shared colors, spacing, and fonts live in `src/constants/theme.ts`; theme state is managed by `ThemeContext.tsx`.

The Documents implementation is preserved in `src/screens/Documents.tsx`, but it is not an app route or menu destination. Document access and case summary are available on Profile.

### Chat

- Messages remain in conversation order, with separate user and assistant bubbles, Markdown paragraphs, headings, lists, and links.
- The conversation scrolls independently of the header and bottom composer. New content scrolls into view when the reader is near the bottom; reading older messages is not interrupted. Sending a message returns to the newest content.
- The composer grows to a maximum height, then scrolls internally. On web, Enter sends and Shift+Enter adds a newline. Empty or blocked submissions are disabled, and duplicate submissions are guarded.
- Assistant responses have Translate and, on web, Copy response actions. Copy uses the browser clipboard and reports failures.
- A genuinely empty conversation shows welcome text and three suggestions that fill the composer. The initial stored assistant greeting counts as a message, so normal first-run state may already show a conversation.
- Loading indicators, request errors, and legal disclaimers remain visible.

Each chat request includes the system prompt, saved location, extracted eviction notice and lease text, additional-file metadata/available extracted text, extracted deadlines, and conversation history. The model is currently `gpt-4.1-mini`. Prompts request relevant follow-up questions and distinguish user-provided details from established facts. They guide model behavior; they do not guarantee legal accuracy or verify evidence.

### Translation

Pressing Translate opens a language picker every time. Selecting a language translates all chat messages, including later messages, to that language and updates translated interface labels. Each message can show its original text again; selecting the same language retries message translation after a failure.

Supported choices are English, Spanish, French, German, Italian, Portuguese, Romanian, Japanese, Korean, and Simplified Chinese. Navigation, chat controls, profile labels, and checklist labels use the shared translation context. Calendar months, weekdays, and displayed dates use the selected locale.

The client posts to `/api/translate` on the Express service, which calls Google Cloud Translation with server-side credentials. Interface strings are translated in a batch and cached by language and interface version. Failed interface requests fall back to English. Message failures keep the original content and show a translation error.

Selecting a translation language saves it as **Preferred language** in the user profile, displayed under Your Information. On reload, the saved language applies to the interface and conversation automatically. Existing browser-only language preferences are migrated into the profile. Selecting Translate still opens the language picker each time. Interface caches are saved when browser storage is available. Stored documents and extracted task names are not automatically rewritten into the selected language. The case summary is displayed in the preferred language, while its saved source and download remain English.

### Profile and document uploads

Use Profile to set location, upload or replace an eviction notice and lease agreement, view originals, and manage additional information. Location selection supports device location permission or manual entry.

The eviction notice and lease rows include a middle-column **View** action. Editing a document opens the upload picker directly. Supported primary-document formats are PDF, JPEG, PNG, and WebP, with a 20 MB limit per file.

The upload flow:

1. Validate the selected file type and size.
2. Extract text from PDFs using the PDF parser, or transcribe images through OpenAI.
3. Ask OpenAI to extract named court, payment, and housing deadlines.
4. Validate the returned dates and convert extracted months from 1–12 to JavaScript's 0–11 representation.
5. Save the original and extracted text, then replace only that document's calendar events.

Canceling or failing processing preserves the existing document and deadlines. PDFs without readable/selectable text can fail extraction; a clear supported image can be used instead.

The viewer previews supported originals on web and provides open/share or download actions appropriate to the platform. If an original is unavailable, extracted text remains available when present; re-upload to restore the original preview.

**Additional information** accepts multiple files of any type without an app-imposed count or size limit. Device/browser storage still limits capacity. Successfully saved files remain available even if another file fails. In profile edit mode, an × button beside each additional file removes its saved original and profile entry. If deletion fails, the entry stays available for retry. The case summary updates automatically after removal. These attachments currently store originals and metadata with empty extracted text: they are **not automatically transcribed or analyzed**. Unsupported preview formats can be downloaded/opened externally.

### Case summary

The separate **Case summary** box below Your Information contains a downloadable/shareable report. Download opens a choice:

- **All case information (ZIP):** downloads `all-case-info.zip`, with `0000-case-summary.txt` first, then original eviction notice, lease agreement, and additional uploads in numbered entries. Original file bytes and languages are preserved. Numbered, sanitized filenames prevent duplicate names from overwriting one another and keep the summary first when sorted by name. If an original is missing (including older uploads without a saved original), the app identifies the file and stops the ZIP export; re-upload it or choose summary only.
- **Case summary only:** downloads/shares the canonical English `case-summary.txt`.

The archive is assembled locally without uploading files to a server. Web downloads through the browser; Android/iOS use `expo-sharing` with a temporary ZIP removed after sharing. Custom native development builds need rebuilding after installing this dependency. Export size is constrained by available device memory and the standard ZIP limits (under 4 GiB and at most 65,535 entries, including the summary).

The summary contains:

```text
User Name:
Preferred Language:
Location:
Housing Location/Type:
Deadlines:
Legal reason for eviction:

Additional Info (from chatbox conversation)
```

The Preferred Language field follows the profile selection automatically and is read-only in the report editor. The English download uses the English language name (for example, Spanish); the on-screen report still uses the preferred display language.

`CondensedInfoProvider` stays mounted across screens. It watches preferred language, location, document text, deadlines, additional-file metadata/text, and conversation changes. Updates are debounced by 400 ms. It reuses a report whose source matches the current data and cancels obsolete requests so older results cannot overwrite newer information.

When source material exists, OpenAI extracts structured details in English, which are validated and formatted into the report. Report field values are normalized to English through the translation service before saving; English field labels and personal names are preserved. This step also covers deadlines extracted from non-English documents. Missing fields are marked `Not provided`; deadlines are sorted by date. There is no manual refresh button.

The chat subtitle contains concise, case-relevant details or evidence reported by the user. The prompt asks the model to avoid repeating document/profile information, general conversation, and an AI legal assessment. Entries are attributed as `User reports`; the app does not independently verify them. Whole eviction notices, leases, and an AI assessment are not appended as separate report sections.

Use **Edit information** to change report fields, then **Save changes**. Only changed fields become saved overrides. Overrides survive automatic regeneration, while untouched fields continue to update from the source data. These edits affect the report only: they do not edit source documents, change calendar deadlines, or replace the profile context sent to chat. The editor opens the English source. If edits are entered in another language, changed field values are translated to English before saving; a translation failure keeps the draft available for retry. Download/share always uses the English report with saved overrides applied.

For display, the report is translated into the preferred language in component memory only. It updates when the report or preference changes, and outdated translation responses are discarded. While translation runs, a loading message is shown. If it fails, the English report is displayed with a retry control; the English download remains available. Display translations never replace the stored report.

### Case Status

Open **Case Status** from the existing authenticated menu (`/case-status`). The page shares the app’s responsive layout, green themes, dark mode, translated interface, and per-account Redux store. No new dependency or server setup is required. The account API currently has no case-record endpoint, so this feature uses device-local persistence rather than cloud sync.

- The current-status card shows a plain-language explanation and evidence level. No case is inferred from an uploaded filename. **Set Up My Case** opens a short branching questionnaire about a decision, hearing, court papers, response, and notice; unknown answers stay unknown. Review the resulting editable details before saving.
- The five-stage horizontal tracker explores Notice Received, Court Case Started, Court Response, Hearing / Decision, and After Decision. Earlier/current segments are green and future segments gray. Exploring a stage never changes the saved status. The selected stage shows relevant document types, possible next steps, and official resources.
- **Overview** explains the saved stage, possible next developments, and important deadlines. Existing calendar events appear with their actual dates. Extracted dates remain **Deadline not yet verified**; no dates are calculated from a stage or service date. A deadline is labeled verified only with valid date, source, reviewer, and review timestamp metadata. Calendar links open the existing calendar.
- **Next Steps** provides stage-specific checklists. Completion is persisted by stage and task ID, independently of legal status. Represented users are not given a task to find a representative. Links reuse Chat, Profile document uploads, Calendar, and Lawyer Connect.
- **Case Details** edits rental-property state/county/city, reported stage, notice type, service date/method, case number, response status, and representation. Dates are validated; missing fields display unknown. Saved edits are always user-reported and reset any prior verification claim. Last updated reflects saved detail edits. Checkboxes do not file documents or verify anything.
- **View hypothetical case** previews a clearly labeled fictional California case with **Court Papers Received** as its current status. Its checklist/form changes are in component memory only; no real documents, deadlines, case data, notifications, or account records are created or overwritten. Return to my case restores the real view.

California education is configured separately in `src/case/config.ts`, based on the [California Courts tenant eviction guide](https://selfhelp.courts.ca.gov/eviction-tenant), its notice/response guidance, and its trial guidance. Source review date: October 24, 2026. No specific legal deadlines or outcomes are predicted. Other jurisdictions can save case details but receive no California-specific case guidance until configured. Profile location is only an editable starting point; users should confirm the rental property’s jurisdiction.

Integration boundaries: `src/case/types.ts` defines versioned records, evidence provenance, and deadline verification. `src/case/integrations.ts` defines a document-assessment contract and a structured case context for future RAG/lawyer integration. These are not automatic classifiers or verifiers. There is no court-verification service yet; uploaded documents or AI output alone cannot create a verified badge. A future trusted reviewer/classifier integration must provide provenance and validate authorization before writing those fields. Existing RAG behavior and lawyer matching are reached through their current pages; case-detail edits do not silently change their inputs.

Private records use the existing account keys (`persist:app:user:<account-id>`) and authenticated routes, with no public case API. Browser/device storage is not encrypted; local access protections and backups remain device responsibilities. The fictional sample is kept out of stored user data and all external requests.

### Calendar and priority checklist

The calendar displays extracted court, payment, and housing events as colored indicators. It initially scrolls to the current month. Select a day to view its events and whether they came from the eviction notice or lease agreement.

The **Priority checklist** sits beside the calendar when enough content width is available and above it on smaller layouts:

- Tasks come from existing calendar events, rather than a separate manually entered list.
- Unfinished tasks appear first, ordered by deadline; overdue dates naturally come first.
- Each task has a checkbox and its deadline in smaller, muted text beside it.
- Checking a task crosses it out and moves it below unfinished tasks. Tap again to undo.
- Completion is saved separately from events, so checking a task does not remove its calendar date or alter the case summary.
- Replacing/removing a document's events removes their old completion markers. Newly extracted events start incomplete.

Notification scheduling helpers exist in `src/events/notifications.ts`, but are not currently wired into the screens or providers. The calendar/checklist does not automatically send reminders.

### Lawyer Connect

Recommendations use the SQL-generated `src/data/lawyers.json` directory. Language matches earn their slider weight. Specialization earns its weight multiplied by the fraction of selected services the organization lists (for example, two of three services earns two-thirds of the weight). Distance earns `proximity weight / (1 + miles / 25)`: full points at zero miles, half at 25 miles, and a quarter at 75 miles. The score is earned points divided by applicable weights, multiplied by 100. Distance is approximate straight-line distance (Haversine), not driving distance. Exact scores determine ordering, with names breaking ties; displayed scores are rounded. County coverage does not score, filter, or reorder recommendations, and no profile-based county coverage status is displayed. The popup selects the highest-scoring organization listing at least one requested service; confirm its service area directly.

Profile location selection now retains GPS or search-result coordinates. Lawyer Connect automatically resolves existing text-only profile locations through the existing Nominatim location service and saves the coordinates per account. Done waits for this lookup; failures show a retry control. City, state, and country must match the returned result, and late responses cannot overwrite profile edits. A city search measures from the returned city point, not the user's home. Five public office addresses were geocoded using the [US Census geocoder](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html) and are stored in `organization_coordinates` with address and source provenance; the export only uses coordinates matching the current address. Bay Area Legal Aid has no supplied address and receives no distance points. Missing user coordinates disable distance scoring for every provider. No user location is sent to the Census service at runtime. Unknown languages earn no confirmed-match points; affordability uses explicitly fabricated test prices from `organization_test_prices`, never actual fees. Every price and the recommendation screen disclose this. Each amount is a fictional USD price per consultation; its points are `affordability weight / (1 + test price / 100)`. Lower prices earn more points. Missing or invalid test prices earn no affordability points; if none are available, this factor is excluded for everyone. Scores are demo preference matches incorporating fictional prices, not lawyer quality or acceptance probability.

The Your priorities panel has four independent sliders: distance, case specialization, language compatibility, and affordability. Each starts at 5 and accepts whole numbers from 1 to 10. Labels follow the preferred language. Values and the selected services are saved in the account’s local profile and update recommendations immediately. Select any combination of eviction defense, tenant counseling, fair housing, and mediation; tap again to deselect. At least one selection is required to press Done. Existing single-service preferences migrate automatically. The default service is eviction defense.

Lawyer Connect displays priority sliders and lists the supplied organizations under **Local legal help**. Users contact organizations themselves. Press **Done** below the sliders to apply the current rankings to every Local legal help card, display a green match percentage beside each organization’s name, and open a popup suggesting an organization listing at least one selected service. The popup shows the match score, reasons, and contact links; Close returns to the preferences. If there is no confirmed match, the popup explains that instead. It does not book appointments or message lawyers. The page also displays all six organizations from the SQLite directory in a responsive card grid. Select the **Local legal help** heading to expand or collapse the entire grid; a down/up chevron indicates its state. The section starts collapsed. Expanded cards show contact links, counties, services, representation levels, case stages, addresses, and languages. Descriptions, services, representation levels, case stages, language names, and assistance notes translate into the preferred language; organization names, county names, addresses, and contact destinations stay unchanged. Translation failures show English details with a retry control. Translated text stays in memory and does not alter the database. Missing details are labeled Not provided. Website, phone, and email links open the appropriate browser or device handler.

## Legal-help organization database

`data/lawyers.sqlite3` is a SQLite database containing six user-supplied organizations: Project Sentinel, Law Foundation of Silicon Valley, Bay Area Legal Aid, Eviction Defense Collaborative, Legal Aid Society of San Mateo County, and Community Legal Services East Palo Alto.

The directory preserves the supplied contact details and descriptions. Information has not been independently verified. Unspecified emails and addresses are SQL `NULL`; missing language lists mean unknown, not that no languages are supported. Additional language assistance is recorded in `language_assistance_notes`.

| Table | Contents |
| --- | --- |
| `organizations` | Stable organization ID, name, website, phone, email, address, description, language assistance notes. |
| `organization_counties` | One county served per organization/row. |
| `organization_services` | One service per organization/row. |
| `organization_representation_levels` | Advice, limited representation, or full representation as supplied. |
| `organization_case_stages` | Case stages supported, preserving the supplied terminology. |
| `organization_languages` | Explicitly listed languages per organization. |

Schema: `src/constants/lawyers_structure.sql`. Seed data: `src/constants/lawyer data/populated_data.sql`. These replace the previous incompatible fictional MySQL examples. Rebuild/update the database using Python 3 (no additional Python packages required):

```bash
python3 scripts/build-lawyer-database.py
```

Re-running updates the six supplied organizations and their associated lists without creating duplicates or deleting unrelated organizations. Applications opening this database should enable `PRAGMA foreign_keys = ON` for foreign-key enforcement.

Example query to find organizations serving Santa Clara County:

```sql
SELECT o.name, o.website, o.phone, o.email
FROM organizations AS o
JOIN organization_counties AS c ON c.organization_id = o.id
WHERE c.county = 'Santa Clara'
ORDER BY o.name;
```

This is a local directory database, separate from user profile storage. The build script also exports `src/data/lawyers.json`, which Lawyer Connect bundles for offline display on web and native without a database server. After editing the seed data, rerun the build script and rebuild/reload the app. Contact links still require the relevant browser/device handler.

## Data storage and external services

| Data | Current storage/flow |
| --- | --- |
| Chat, location, document metadata/extracted text, deadlines, additional-file metadata, report, report overrides, checklist completion, preferred language | Redux state persisted through `redux-persist/lib/storage` on web, under `persist:app:user:<account-id>` in localStorage. Guest onboarding uses `persist:app:onboarding`. |
| Original uploaded files on web | IndexedDB database `evictwise-documents`, object store `files`. Redux stores the file identifier. |
| Original uploaded files on native | Copied into the application's documents directory through Expo FileSystem. |
| Theme and language preferences | Browser localStorage when available (`preferred-theme`, `preferred-language`). |
| Translated interface strings | Versioned per-language localStorage entries; message translations remain component state. |
| Chat, document image transcription, deadline extraction, report generation | Sent to OpenAI from the client as needed. |
| Translation text, interface strings, and case summary display/English normalization | Sent through the Express API to Google Cloud Translation. |

Accounts are stored on the server, but case profiles and original documents are still local: there is no cloud synchronization for case data. Profile storage is separated by account in the app; localStorage and IndexedDB are not encrypted and remain accessible to someone with access to that browser/device. Legacy unowned `persist:app` data is left intact and is not automatically imported into a new account. Clearing browser site data can remove saved information and originals. Switching browser origins/ports uses a different browser storage area. Native Redux metadata now persists to account-specific files under the app-private document directory (`account-state/`) using the already installed Expo FileSystem. These files are not separately encrypted. Web case saves flush localStorage and report write failures rather than claiming success; native case saves flush the file adapter.

**Development credential limitation:** OpenAI calls currently run in the client with `dangerouslyAllowBrowser: true`. `EXPO_PUBLIC_OPENAI_API_KEY` is bundled into the client and is visible to users, even if `.env.local` is ignored by Git. A production deployment needs authenticated server-side OpenAI calls and appropriate handling of uploaded personal information. Keep actual credentials, environment files, and logs out of commits.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/app/_layout.tsx` | Theme, Redux persistence, translation, condensed-info, menu providers, and route stack. |
| `src/app/index.tsx` | Redirects to Profile after authentication. |
| `src/app/chat.tsx` | Chat requests, composer, conversation scrolling, and empty state. |
| `src/app/welcome.tsx` | Language-first welcome, overview, account creation, and sign-in. |
| `src/context/GuidedTourContext.tsx` | First-visit pointer bubbles, target measurement, menu guidance, and completion state. |
| `src/context/AuthContext.tsx`, `src/auth/api.ts` | Session restoration, authentication, and logout. |
| `server/auth.cjs` | Private account database, scrypt password hashing, sessions, and throttling. |
| `src/app/case-status.tsx`, `src/case/` | Case Status page, intake, details form, configuration, evidence rules, and future integration contracts. |
| `src/storage.ts`, `src/storage.native.ts` | Account-keyed browser/native persistence adapters. |
| `src/app/profile.tsx` | Profile information, upload/view actions, and case summary placement. |
| `src/app/calendar.tsx` | Calendar grid, selected-day details, responsive checklist placement. |
| `src/app/lawyer-connect.tsx` | Local legal-help organization cards from the generated dataset and contact actions. |
| `src/components/Layout.tsx` | Responsive sidebar, header, and theme toggle. |
| `src/components/MessageRender.tsx` | Markdown bubbles, translation picker, copy, loading, and disclaimers. |
| `src/components/PriorityChecklist.tsx` | Checklist UI and completion controls. |
| `src/components/CondensedUserInfo.tsx` | Report display, field editing, and download/share. |
| `src/context/CondensedInfoContext.tsx` | Automatic report generation, source tracking, debounce, and cancellation. |
| `src/hooks/useDocumentUpload.ts` | Primary-document upload, extraction, validation, and event replacement. |
| `src/utils/` | Original file storage, profile context, report formatting/overrides, checklist sorting. |
| `src/Translation/` | Active translation provider, supported languages, API client, and selector. |
| `src/constants/assistantAI/prompt.ts` | Assistant greeting and chat, extraction, and condensed-info prompts. |
| `src/constants/theme.ts`, `src/md.ts` | Shared palettes/typography and Markdown styles. |
| `src/slice.ts`, `src/store.ts`, `src/types.ts` | State actions, persistence configuration, and shared data types. |
| `server/index.js` | Translation API, CORS, Google client, and health endpoint. |
| `scripts/start-development.cjs` | Combined API/Expo startup and child-process lifecycle. |
| `tests/`, `server/translation.test.cjs` | Regression tests for behavior and API integration. |

## Verification

Run from the project root:

```bash
npx tsc --noEmit
node --test tests/*.test.cjs
npm run test:translation
npm run test:auth
git diff --check
```

Tests cover onboarding, profile isolation, account/session lifecycle and security checks, upload success/failure, profile context, automatic report updates and cancellation, report edits, checklist ordering/completion, chat input/scrolling, startup lifecycle, notification helpers, and translation HTTP/CORS/error handling. Translation tests mock Google rather than using live credentials; HTTP tests need permission to bind local ports. Account tests use temporary databases and do not create real accounts. These checks do not replace browser or native-device visual testing.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Translation reports `Failed to fetch` or an unreachable service | Use `npm run web` / `npm start`, or start `npm run server` separately. Check `http://localhost:3001/api/health`, the configured API URL, and exact `CLIENT_ORIGIN`. |
| API health succeeds but translation fails | Health only checks that Express is reachable. Check Google project, credentials, API access, and server errors. |
| Web app is served over HTTPS but translation is HTTP | Use an HTTPS translation endpoint accessible from that origin; browser mixed-content rules can block HTTP calls. |
| Chat, extraction, or report generation fails | Check the OpenAI development key, connectivity, provider access, and document readability. Translation credentials are separate. |
| Original document preview is missing | The original may be absent from local storage. Re-upload; extracted text alone cannot reconstruct the original PDF. |
| A report field stops updating automatically | It may have a saved manual override. Unedited fields still regenerate. |
| Checklist is empty | Upload an eviction notice or lease containing extractable deadlines. Additional-file uploads do not currently extract events. |
| Data appears missing after changing development ports | Browser storage is scoped to the origin. Return to the original origin to access its saved data. |

## Retrieval-augmented chat (RAG)

Chat now uses an authenticated server endpoint (`POST /api/auth/chat`) to retrieve legal references before generating an answer. Existing profile context, follow-up questions, translation, and chat controls are preserved. Expand **Legal sources** under an answer to see the original excerpts and their filename, PDF page, or text passage number. The displayed answer can be translated; source excerpts remain verbatim.

### Add your legal knowledge

1. Set `GEMINI_API_KEY` in `server/.env` (server-only; do not prefix this key with `EXPO_PUBLIC_`).
2. Put UTF-8 `.txt`, `.md`, or text-based `.pdf` reference files in `src/legal_knowlege/`, including nested folders. Include jurisdiction, effective/review dates, and official URLs in the source text. Scanned PDFs require OCR; maximum file size is 25 MB.
   Catalog Markdown marked `content_status: source-reference-only` is skipped. Replace it with reviewed full source text and remove that marker before indexing. `RAG_KNOWLEDGE_PATH` can select a different folder.
3. Run `npm run rag:index` and check its file/chunk counts. Repeat after changing or deleting documents. The command skips unchanged chunks, replaces changed chunks, and removes deleted sources. Failures preserve the prior index.
4. Start/restart the API with `npm run server`, or use `npm run web` to launch the development app/API. An already running API must be restarted once after this code update. Later index updates do not require a restart.

The default embedding model is `gemini-embedding-001`; `RAG_EMBEDDING_MODEL` overrides it. Changing the model requires rebuilding the index. The default generation model is `gemini-3.5-flash`, configurable through `RAG_CHAT_MODEL` in `server/.env`. See the [Gemini compatibility documentation](https://ai.google.dev/gemini-api/docs/openai).

### How retrieval works

The indexer extracts text, splits it into approximately 1,800-character passages with 250-character overlap, batches embeddings, and stores vectors and source metadata in `server/private/legal-index-gemini.sqlite3`. At chat time, the last four turns form the search query. Exact cosine search selects up to six passages with score >= 0.25. This lightweight SQLite implementation is intended for small/medium curated libraries; search scans all vectors and is not an approximate-nearest-neighbor service. Evaluate retrieval quality against your own legal questions before production use; the score cutoff is a heuristic, not a legal-confidence measure.

The server combines retrieved text with bounded recent conversation and saved profile context. Only user/assistant message roles are accepted; system instructions stay server-controlled. Generation is instructed to cite retrieved sources, distinguish personal facts from legal rules, check jurisdiction/dates, and acknowledge missing support. Citation IDs are validated against retrieved passages; this does not independently prove every generated claim. With an empty library or no matching passages, chat returns an explicit knowledge-gap response without generating unsupported legal guidance.

Requests require an existing account session, have size/concurrency limits, and are limited to 60 per account per 15 minutes. No queries or personal profile data are stored in the shared legal index. Source text is sent to Google Gemini for embeddings; retrieved passages, recent chat, and profile context are sent for answer generation. This change moves **chat** generation calls server-side; other existing document/report AI features retain their current configuration.

Local source documents, credentials, and generated indexes are gitignored. Back up the corpus and index separately on the deployment server. The corpus is shared across signed-in accounts, so do not add private case files to it.

Validation: `npm run test:rag`, `npm run test:auth`, `node --test tests/*.test.cjs`, and `npx tsc --noEmit`.

### Import source links

Run `npm run rag:fetch` to download explicit URLs from `src/legal_knowlege/manifest.json` and supplemental direct links in `server/rag/source-links.json`. Then run `npm run rag:index` to embed the imported text. The importer extracts HTML content, accepts PDFs/text, limits download size and time, checks redirects, and skips generic homepages, code overviews, and detected access-block pages. It does not crawl entire websites, execute JavaScript, or fetch all documents linked from an index page.

Downloads and provenance sidecars are saved under `src/legal_knowlege/imported/`; the originals in the catalog are preserved. Each indexed passage includes its source URL and retrieval date. Retrieval dates are not verification of legal currency. Review extracted content before relying on it; directory/index pages remain directory/index content, not the full statutes they link to. Imported content is untrusted data for the answer generator.

Check `server/private/source-import-report.json` for downloaded, failed, and needs-specific-url results. For blocked or missing pages, supply a direct accessible document URL or upload the document manually. Failed refreshes retain previous downloads; to retire a source, remove its downloaded file and sidecar, remove its catalog URL, then rebuild. Unchanged download content retains its provenance date to reuse embeddings. Run `python3 scripts/test-fetch-legal-sources.py` to test the importer.

Catalog entries can set `local_file` to a path relative to `src/legal_knowlege/`. The fetcher validates that the file exists and reports `supplied-locally` instead of retrying its remote URL. Uploaded Palo Alto code is stored under `01_Laws_and_Regulations/`, and Santa Clara civil court rules under `02_Court_Procedures_and_Explanations/`, each with a provenance sidecar.

### Migrating the RAG index to Gemini

Set `GEMINI_API_KEY` in `server/.env`, run `npm run rag:index`, and restart the API. The old OpenAI index remains at `server/private/legal-index.sqlite3`; Gemini uses `server/private/legal-index-gemini.sqlite3`. All passages must be embedded with Gemini before retrieval can use them. The old vectors are never mixed with Gemini vectors. A failed rebuild preserves the previous complete Gemini snapshot.

RAG uses the existing `openai` npm package as a transport to Google's documented compatibility endpoint; it sends RAG requests to Google, not OpenAI. The key stays server-side. Document extraction and condensed-report generation are separate existing features and still use `EXPO_PUBLIC_OPENAI_API_KEY`; this migration covers RAG chat and indexing.

### Text search when embeddings are unavailable

`npm run rag:index:text` builds a local SQLite full-text index without an API key or embedding quota. `npm run rag:index` now publishes that text index before attempting vector embeddings. Chat uses text retrieval when the vector index is empty, vector search returns no matches, or embedding requests hit a 429 rate limit. Responses still use Gemini and include retrieved citations. Text retrieval uses stemming and keyword relevance; it does not provide the same multilingual or semantic matching as vector search. Re-run indexing after changing source files. An empty index is reported as a setup issue rather than missing legal evidence.

### RAG reliability and migration notes

Chat defaults to `gemini-3.5-flash`, with one fallback attempt to `gemini-3.1-flash-lite` for temporary provider failures. Configure `RAG_CHAT_FALLBACK_MODEL=` to disable fallback. Requests have bounded timeouts; invalid credentials and invalid request schemas are not retried against another model. Startup verifies the API exposes RAG chat rather than reusing an older account-only server.

Indexing saves successful embedding batches in `embedding_cache`. After a quota failure, rerun `npm run rag:index` to reuse completed work. The indexing command waits for up to three attempts per rate-limited batch and prints progress. Retrieval only sees complete vector snapshots. Source fingerprints prevent an older vector snapshot from serving deleted/changed material after text indexing succeeds but embedding fails.

Embedding input now excludes repeated provenance headers (`body-v1`). Existing vector snapshots require a rebuild; text retrieval remains available in the meantime. Source metadata is still preserved in retrieved excerpts and citations. Text fallback also covers embedding timeouts and temporary service errors. Gemini can group citations, but every cited ID must still belong to the retrieved source set. This validation checks references, not the truth or completeness of every generated legal claim.

Large saved profiles are shortened as valid JSON with an explicit truncation flag, keeping both primary documents and deadline metadata within the context limit. Source PDFs with blank pages no longer fail the entire corpus; empty pages emit a warning for OCR review, and PDFs with no extractable text still fail. Review these warnings because a page without text may contain a scanned image.

RAG answers now render explicit inline source citations as clickable Markdown links. The server replaces each validated `[S1]` marker with the URL stored in the source provenance, never a model-authored destination. The expandable source list includes document titles, original URLs, excerpts, and page/passage numbers. Sources without a web URL open the local excerpt in the chat UI. Translation protects citation links and restores their original destinations; if a citation marker is lost, the original answer remains visible with the existing translation-error message. Citation checks validate source identity, not whether every legal claim is correct.

### Jurisdiction filtering

RAG filters source passages before selecting the top results in both vector search and text search. It uses the saved profile location (country/state/city/county); because this may be the user's current location rather than the rental property, the prompt requires confirmation before treating local rules as applicable. A conflicting rental location in chat requires updating the profile. Missing/contradictory location data produces a clarification request without generating local legal guidance.

For the current California corpus, US federal sources apply across US locations; California sources apply within California; city and county sources require a matching city or county. An explicit mapping resolves counties for covered Bay Area cities and Los Angeles when older profiles lack county data. New location selections preserve the geocoder's county field. Unknown locations are not guessed. Sources labeled `See source`, missing jurisdiction labels, and out-of-area sources are excluded. Outside California, the current corpus can supply federal material only. The regional Bay Area directory is limited to the nine Bay Area counties.

Scope comes from the `jurisdiction` field in source sidecars and is included in indexed provenance and displayed source details. Use labels such as `United States`, `California`, `Santa Clara County, California`, or `Palo Alto, California`; unsupported labels remain excluded. Update metadata and run `npm run rag:index:text` (and later `npm run rag:index` for vectors) after changes. Geographic filtering does not establish venue, case-type applicability, source currency, or whether a particular tenant qualifies for a rule.
