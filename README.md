# EvictWise

A React Native / Expo-style application that helps users understand housing, rent, and eviction-related information. The app appears to include chat support, document upload, calendar/deadline support, user profile screens, language selection, location selection, shared theme constants, and global app state.

> Note: This README was created from the uploaded files plus the provided project-structure screenshots. Files shown only in the screenshots are documented based on their names and folder placement, while the uploaded code files are documented from their actual contents.

## Project structure

```text
src/
├── app/
│   ├── _layout.tsx
│   ├── calendar.tsx
│   ├── EvictionUploader.tsx
│   ├── index.tsx
│   └── profile.tsx
├── components/
│   ├── Layout.tsx
│   └── MessageRender.tsx
├── constants/
│   ├── prompt.ts
│   └── theme.ts
├── context/
│   └── MenuContext.tsx
├── Language/
│   ├── LangOptions/
│   │   ├── en.json
│   │   ├── es.json
│   │   ├── hi.json
│   │   ├── ro.json
│   │   └── zh.json
│   ├── LangSelection.tsx
│   ├── Translation.ts
│   └── Translations.js
├── Location/
│   └── locationSelection.tsx
├── global.css
├── slice.ts
├── store.ts
└── types.ts
```

## Main folders

### `src/app/`
Route-level screens and app entry files.

| File | Purpose |
| --- | --- |
| `_layout.tsx` | App-level route layout. Usually controls shared navigation wrappers and screen structure. |
| `index.tsx` | Main/home screen. Likely the first screen users see. |
| `calendar.tsx` | Calendar or deadline screen for upcoming housing/eviction-related dates. |
| `EvictionUploader.tsx` | Upload screen/component for eviction or housing documents. |
| `profile.tsx` | User profile screen. |

### `src/components/`
Reusable UI pieces used across screens.

| File | Purpose |
| --- | --- |
| `Layout.tsx` | Shared visual page wrapper/layout component. |
| `MessageRender.tsx` | Renders chat messages or assistant/user message content. |

### `src/constants/`
Shared constants used throughout the app.

| File | Purpose |
| --- | --- |
| `prompt.ts` | Defines the assistant’s initial chat message and legal-information system prompt. |
| `theme.ts` | Defines light/dark colors, font families, spacing tokens, and a `getTheme` helper. |

### `src/Language/`
Internationalization and language-selection logic.

| File | Purpose |
| --- | --- |
| `LangOptions/*.json` | Translation dictionaries for English, Spanish, Hindi, Romanian, and Chinese. |
| `LangSelection.tsx` | UI for selecting the app language. |
| `Translation.ts` | TypeScript i18next setup for English and Spanish. |
| `Translations.js` | JavaScript i18next setup intended to support multiple languages. |

### `src/Location/`
Location-selection logic.

| File | Purpose |
| --- | --- |
| `locationSelection.tsx` | UI for selecting or setting the user’s location. |

### App state and shared types

| File | Purpose |
| --- | --- |
| `store.ts` | Global app store configuration, likely Redux or similar state management. |
| `slice.ts` | State slice/reducer logic. |
| `types.ts` | Shared TypeScript types, including the `Message` type used by `prompt.ts`. |
| `global.css` | Global styling imported by the app/theme system. |

## Uploaded file details

### `constants/prompt.ts`
Contains two exports:

- `initialMessage`: the first assistant chat message shown to users.
- `systemPrompt`: instructions for the legal information assistant.

The assistant is designed to explain tenant rights and eviction-related concepts in clear language, avoid unsupported guesses, rely on reputable legal resources, and include a disclaimer that it provides legal information rather than legal advice.

### `constants/theme.ts`
Defines the shared design system:

- `Colors`: light and dark theme color palettes.
- `Themes`: TypeScript type for theme objects.
- `ThemeColor`: TypeScript key type for shared theme color names.
- `getTheme(colorScheme)`: returns the dark or light color palette.
- `Fonts`: platform-specific font family mappings for iOS, web, and default platforms.
- `Spacing`: spacing scale from `half` through `six`.

### `Language/Translation.ts`
Initializes `i18next` with React support using `initReactI18next`. It currently imports English and Spanish JSON dictionaries and sets English as the default and fallback language.

### `Language/Translations.js`
Provides a JavaScript translation setup and exports `getNativeTranslation(text, targetLanguageCode)`. It imports English, Hindi, Romanian, and Chinese dictionaries and configures `i18next`.

## Important notes

- `Translations.js` references `es` in the `resources` object but does not import `es`. Add this import if Spanish should be supported there:

```js
import es from "./LangOptions/es.json" with { type: "json" };
```

- `Translation.ts` and `Translations.js` overlap in purpose. Consider keeping one translation setup file to avoid inconsistent language support.
- Because this project handles eviction and legal-information content, the app should clearly show that it provides legal information, not legal advice.

## Quick start

Install dependencies and start the app using the package manager configured in your project:

```bash
npm install
npm start
```

or, if this is an Expo project:

```bash
npm install
npx expo start
```

