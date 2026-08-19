# Analogix

Analogix is a study workspace for Australian secondary students in Years 7–12.

It combines an AI tutor with notes, flashcards, quizzes, deadlines, study sessions, and collaborative rooms. With Analogix, students can go from "What does this mean" to "I understand it in my own words and have practiced it properly" without switching between several apps and/or websites.

> **Status:** Pilot and testing; project is not yet deployed in production but is being actively developed. Users are free to test and give feedback of the product and any of its features.

## Why I built this

I started Analogix because the study tools I tried were either too generic or scattered across different apps. I wanted one workspace where a student could ask a question, turn the explanation into flashcards, plan when to revise it, and work with classmates.

I never understood technical jargon or textbook explanations, but learnt almost all my concepts by mapping them to my own interests. That's when I decided to build Analogix, so other students have that same luxury without having to spend hours searching for the right explanation or example. The AI tutor is designed to explain concepts using analogies, and the study tools are built around how school work actually arrives: assessment notifications, deadlines, and subject-based revision.

I am building this primarily for Australian secondary students, so the curriculum and assessment structure are important parts of the project. The tutor responds with analogy-first explanations, draws context from the student's own workspace, and the study tools are built around how school work actually arrives: assessment notifications, deadlines, and subject-based revision.

## Screenshots

![Landing](./public/landing.png)
![Dashboard](./public/dashboard.png)
![AI tutor chat](./public/chat.png)
![Document editor](./public/document-editor.png)
![Flashcards](./public/flashcards.png)
![Calendar](./public/calendar.png)
![Study rooms](./public/rooms.png)
![Formula sheets](./public/formulas.png)

## Main features

- Ask the tutor questions using context from your notes and uploaded resources.
- Create documents with maths, code blocks, tables, and version history.
- Generate and review flashcards using spaced repetition.
- Practise with quizzes and receive feedback on short-answer responses.
- Track deadlines, study sessions, and progress from one dashboard.
- Collaborate in shared study rooms with real-time document editing.

The full feature matrix is in [docs/features.md](./docs/features.md).

## Technology

Next.js, TypeScript, Supabase, Groq, Vercel AI SDK, PostgreSQL, Yjs, Tailwind CSS. Architecture notes, the full tech stack, and build configuration are in [docs/architecture.md](./docs/architecture.md).

## Current limitations

The project is built incrementally and some areas are still experimental:

- Collaborative rooms need more testing under multiple simultaneous users.
- Tutor memory features are still being refined.
- Responses may take longer due to limited context on Groq's free plan

## Development notes

This project is being developed incrementally. The current focus is improving the tutor's workspace context, document reliability, and curriculum-specific responses. I keep my own design notes and reasoning for the key choices - why Groq for inference, Supabase for auth and storage, Yjs for collaboration, and the ACARA curriculum data structure - in [docs/architecture.md](./docs/architecture.md) and in the commit history.

## License

Copyright (c) 2026 Analogix. All rights reserved.

This software and associated documentation files (the "Software") may not be reproduced, distributed, modified, or sublicensed in any form or by any means without the express written permission of the copyright holder.

## Further documentation

- [docs/features.md](./docs/features.md) - full feature matrix and page list
- [docs/api.md](./docs/api.md) - REST API endpoints
- [docs/architecture.md](./docs/architecture.md) - architecture, tech stack, build config
