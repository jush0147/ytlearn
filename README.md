# YT Immersive Language Learning App (MVP)

Local-first, mobile-first web app for learning from YouTube captions.

## Run
- `npm install`
- `npm run dev`
- Open `http://localhost:5173`

## Pages
- `#/` Paste YouTube URL
- `#/watch?v={videoId}` Watch + captions + word interaction
- `#/settings` Gemini/API/language settings

## Features
- Caption load priority: cache -> YouTube timedtext -> Gemini translation -> Gemini fallback transcript.
- Bilingual caption list with active-row highlight, auto-scroll, and click-to-seek.
- Word bottom sheet with pronunciation + Gemini meaning + status (new/learning/known).
- Persistence via localStorage keys:
  - `wordRecords`
  - `wordMeaningCache`
  - `userSettings`
  - `captions:v2:{videoId}:{sourceLanguage}:{targetLanguage}:{model}`

## Limitations
- YouTube timedtext availability depends on the target video/caption permissions.
- Gemini responses may occasionally return malformed JSON; app shows graceful error message.
- This project is local-only (no backend, no auth, no cloud sync).
