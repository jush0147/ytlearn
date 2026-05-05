# Project: YT Immersive Language Learning App (MVP)

You are implementing a local-first, mobile-first web app for immersive language learning from YouTube videos.

## Goal
Build a working MVP in this repository using:
- React
- Vite
- TypeScript
- React Router
- localStorage
- YouTube IFrame Player API
- Vite dev proxy for YouTube timedtext
- Gemini API via user-provided API key
- Web Speech API

This app runs locally only. No backend. No auth. No deployment work is needed.

## Routes
- `/` home page
- `/watch?v={videoId}` watch page
- `/settings` settings page

## Storage rules
Use localStorage only.

Keys:
- `wordRecords`
- `wordMeaningCache`
- `userSettings`
- `captions:v2:{videoId}:{sourceLanguage}:{targetLanguage}:{model}`
