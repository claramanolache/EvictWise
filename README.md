# Evict Wise

Evict Wise is an Expo / React Native app for organizing eviction-related documents, understanding housing questions, tracking deadlines, and preparing information to discuss with a legal professional. It uses Expo Router, Redux Toolkit, OpenAI, and a local Express API for Google Cloud Translation.

The assistant provides legal information and can make mistakes. Verify extracted dates, summaries, translations, and legal information against your documents and a qualified professional.

## Run locally

Use a Node.js version compatible with the Expo SDK in `package.json`, npm, an OpenAI API key, and a Google Cloud project configured for Cloud Translation with Application Default Credentials.

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

   Alternatively, `npm start` opens the Expo development workflow. Both commands run `scripts/start-development.cjs`: it checks the translation API, starts the default local API if needed, waits for its health endpoint, and then starts Expo. An existing API is reused. Ctrl+C stops processes launched by this script, leaving an independently running API alone.

If `EXPO_PUBLIC_TRANSLATION_API_URL` is set, that service must already be running. Startup reports an error if it cannot reach it; it does not start a replacement server. The automatically launched default API uses port 3001.

For an IDE that launches Expo directly, or a separately hosted API:

```bash
npm run server
```

`npx expo start` bypasses the combined startup script, so the API must be started separately. `npm run ios` and `npm run android` invoke Expo's native build commands and also require a separately reachable translation service. On a physical device, configure the API URL with the development computer's reachable LAN address instead of `localhost`. Restart Expo after changing public environment variables. If Expo uses another web port, update `CLIENT_ORIGIN` and restart the API.

## Using the app

### Navigation and appearance

The hamburger menu contains **Chat**, **Profile**, **Calendar**, and **Lawyer Connect**, with icons and a highlighted current page. On desktop, the expanded sidebar takes its own space and the chat resizes. On narrow screens, it opens over the page with a dismissible backdrop.

The compact top-right switch changes light/dark mode. The app initially follows the system theme unless a saved preference exists. Shared colors, spacing, and fonts live in `src/constants/theme.ts`; theme state is managed by `ThemeContext.tsx`.

The Documents implementation is preserved in `src/screens/Documents.tsx`, but it is not an app route or menu destination. Document access and condensed information are available on Profile.

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

Selecting a translation language saves it as **Preferred language** in the user profile, displayed under Your Information. On reload, the saved language applies to the interface and conversation automatically. Existing browser-only language preferences are migrated into the profile. Selecting Translate still opens the language picker each time. Interface caches are saved when browser storage is available. Stored documents and extracted task names are not automatically rewritten into the selected language. The condensed report is displayed in the preferred language, while its saved source and download remain English.

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

**Additional information** accepts multiple files of any type without an app-imposed count or size limit. Device/browser storage still limits capacity. Successfully saved files remain available even if another file fails. These attachments currently store originals and metadata with empty extracted text: they are **not automatically transcribed or analyzed**. Unsupported preview formats can be downloaded/opened externally.

### Condensed user information

The separate **Condensed user info** box below Your Information contains a downloadable/shareable `condensed-user-info.txt` report:

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

### Calendar and priority checklist

The calendar displays extracted court, payment, and housing events as colored indicators. It initially scrolls to the current month. Select a day to view its events and whether they came from the eviction notice or lease agreement.

The **Priority checklist** sits beside the calendar when enough content width is available and above it on smaller layouts:

- Tasks come from existing calendar events, rather than a separate manually entered list.
- Unfinished tasks appear first, ordered by deadline; overdue dates naturally come first.
- Each task has a checkbox and its deadline in smaller, muted text beside it.
- Checking a task crosses it out and moves it below unfinished tasks. Tap again to undo.
- Completion is saved separately from events, so checking a task does not remove its calendar date or alter the condensed report.
- Replacing/removing a document's events removes their old completion markers. Newly extracted events start incomplete.

Notification scheduling helpers exist in `src/events/notifications.ts`, but are not currently wired into the screens or providers. The calendar/checklist does not automatically send reminders.

### Lawyer Connect

Lawyer Connect displays the saved location, links back to Profile for reviewing information, and opens the Legal Services Corporation and American Bar Association legal-help directories. Users contact organizations themselves. This screen does not book appointments, message lawyers, or automatically match a user to an attorney. The local SQLite organization directory described below is not yet connected to this screen.

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

This is a local directory database, separate from user profile storage. Lawyer Connect currently continues to use its existing external directory links.

## Data storage and external services

| Data | Current storage/flow |
| --- | --- |
| Chat, location, document metadata/extracted text, deadlines, additional-file metadata, report, report overrides, checklist completion, preferred language | Redux state persisted through `redux-persist/lib/storage` on web, under `persist:app` in localStorage. |
| Original uploaded files on web | IndexedDB database `evictwise-documents`, object store `files`. Redux stores the file identifier. |
| Original uploaded files on native | Copied into the application's documents directory through Expo FileSystem. |
| Theme and language preferences | Browser localStorage when available (`preferred-theme`, `preferred-language`). |
| Translated interface strings | Versioned per-language localStorage entries; message translations remain component state. |
| Chat, document image transcription, deadline extraction, report generation | Sent to OpenAI from the client as needed. |
| Translation text, interface strings, and condensed report display/English normalization | Sent through the Express API to Google Cloud Translation. |

There is no account-based cloud synchronization or application database server for user profiles. Clearing browser site data can remove saved information and originals. Switching browser origins/ports uses a different browser storage area. Native metadata persistence is not configured with an AsyncStorage adapter; the existing Redux persistence adapter targets web storage, so cross-launch native persistence should not be assumed.

**Development credential limitation:** OpenAI calls currently run in the client with `dangerouslyAllowBrowser: true`. `EXPO_PUBLIC_OPENAI_API_KEY` is bundled into the client and is visible to users, even if `.env.local` is ignored by Git. A production deployment needs authenticated server-side OpenAI calls and appropriate handling of uploaded personal information. Keep actual credentials, environment files, and logs out of commits.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/app/_layout.tsx` | Theme, Redux persistence, translation, condensed-info, menu providers, and route stack. |
| `src/app/index.tsx` | Chat requests, composer, conversation scrolling, and empty state. |
| `src/app/profile.tsx` | Profile information, upload/view actions, and condensed report placement. |
| `src/app/calendar.tsx` | Calendar grid, selected-day details, responsive checklist placement. |
| `src/app/lawyer-connect.tsx` | External legal-help directories. |
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
git diff --check
```

Tests cover upload success/failure, profile context, automatic report updates and cancellation, report edits, checklist ordering/completion, chat input/scrolling, startup lifecycle, notification helpers, and translation HTTP/CORS/error handling. Translation tests mock Google rather than using live credentials; HTTP tests need permission to bind local ports. These checks do not replace browser or native-device visual testing.

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
