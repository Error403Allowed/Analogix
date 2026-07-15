# Middleware Plan for AnalogixMobile

## Architecture

Mobile (Apollo Client) ───── HTTP ──┐
                                     ├──► AnalogixGraphQL ──► Supabase
Web (Apollo Client)    ───── HTTP ──┘    (Apollo 5 + Express 5)   Groq SDK
                                          │
                                     subscriptions ──► graphql-ws / Redis PubSub

The BFF is a single gateway that all clients hit over HTTP + WebSocket. It handles auth (JWT verification), rate limiting, ties together Supabase + Groq + external APIs.

## What the BFF unlocks
Mobile (AnalogixMobile) — fully blocked without it
Area
Auth profile
Subjects + Notes
Flashcards
AI Chat
Quizzes
Calendar
Study Rooms
Curriculum
Formula Sheets
Research
AI Tools
Dashboard
Mobile total
Web (AnalogixWeb) — mostly works, 3 features dead
Feature
Dashboard streak/stats
Activity chart
Achievement auto-unlock
Tour completion
Everything else (auth, AI chat, flashcards, notes, subjects, rooms, collab, calendar, etc.)

## Deploy plan
1. Push to GitHub
2. Render Blueprint
3. Set 9 secret env vars
4. Deploy
5. Update AnalogixMobile/eas.json
6. Build APK

The render.yaml at the repo root already has everything wired — build command, start command, health check path, and CORS set to https://analogix.vercel.app.