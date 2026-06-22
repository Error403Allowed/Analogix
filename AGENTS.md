## Goal
- Get AnalogixWeb APIs fully integrated into the GraphQL BFF and fix all AnalogixMobile study section UI/UX bugs to parity with web

## Constraints & Preferences
- Everything in AnalogixMobile must work without bugs that negatively affect user experience
- All API functions from AnalogixWeb must have corresponding GraphQL BFF operations
- Mobile app must have industry-level UI/UX quality
- YouTube transcript is dead code — must not be in any app

## Progress
### Done
- Read all 14 BFF schema files, 15 BFF resolver files, 10 mobile GraphQL query/mutation files, 12 web API routes
- Audited all 34 mobile screens against web counterparts
- Added `format` field alias to BFF `ExtractTextResult`
- Added `ExecutePythonResult` type + `executePython` mutation (sandboxed JS eval matching web)
- Added `BannerResult`/`GreetingResult`/`TitleResult` types + `generateBanner`/`generateGreeting`/`generateTitle` mutations
- Added `updateRoomCanvas` mutation to BFF room schema + resolver
- Added presence publishing for `joinRoom` and `updateRoomMemberRole` in BFF room resolvers
- Fixed mobile `DashboardScreen`: time-aware greeting (morning/afternoon/evening), `ChatWidget` subscribes to `CHAT_STREAM` for real AI streaming
- Fixed mobile `QuizSessionScreen`: timer tracks elapsed seconds, submits as `durationSeconds`
- Removed YouTube transcript from Web (api route, lib, hook), Mobile (hook), BFF (schema type, query, resolver, ai/youtube.ts)
- Added `leaveRoom` presence removal (publishes `isOnline: false` event) — other members see user depart in real time
- Fixed BFF flashcardSets cardCount: Supabase aggregate `flashcards(count)` returns `[{count: N}]`, not array — changed to `s.flashcards?.[0]?.count ?? 0`
- Added `setId` to `GenerateFlashcardsInput` shared schema + rebuilt dist
- Fixed BFF `generateFlashcards` resolver: passes `set_id` into DB insert
- Fixed `FlashcardSetScreen.tsx`: passes `setId` directly to `generateFlashcards`; added card editing modal (pencil, editFront/editBack, save)
- Fixed `navigation/types.ts`: broadened `QuizSession`/`QuizResults` params
- Fixed `FormulasScreen.tsx`: duplicate subject names in filter chips — wrapped `subjectNames` with `as string[]` to fix TS `unknown[]` type
- Fixed `EventDetailScreen.tsx`: `isValidDate()` guard, `ActivityIndicator` import, endDate/location fields
- Fixed `CalendarScreen.tsx`: dots 4→6px, term bar cleaned up, `${contentStyle={{ padding: 0, gap: 0 }}}`, improved month cell styling (softer background, better spacing, smaller dots)
- Fixed `QuizSessionScreen.tsx` layout: added `${contentStyle={{ padding: 0, gap: 0 }}}` to all branches, removed outer wrapping View, flat children layout (ProgressBar, ScrollView, footer) — prevents layout collapse from ExpressiveScreen's default 24px gap
- Fixed `FlashcardReviewScreen.tsx` layout: same `${contentStyle={{ padding: 0, gap: 0 }}}` fix, adjusted margins
- Fixed `termData.ts`: `TERM_DATA` replaced with `getTermData(year)` function — no longer stale across year boundary
- Rewrote `FormulaRenderer.tsx`: MutationObserver for height changes instead of fragile 100ms timeout, explicit `javaScriptEnabled`/`domStorageEnabled`, `onError`/`onHttpError` fallback, preconnect to CDN, ResizeObserver fallback, loading state
- Rebuilt shared package so BFF picks up `setId` in `GenerateFlashcardsInput`
- BFF `leaveRoom` now publishes `roomPresenceStream` with `isOnline: false`
- Cleaned 2 typecheck errors: missing `ActivityIndicator` import, `unknown[]` vs `string[]` map callback
- **Switched KaTeX from CDN to local npm package**: `FormulaRenderer` and `BatchFormulaRenderer` now pre-render formulas via `katex.renderToString()` on the JS thread, embed KaTeX CSS as static string — zero network dependency, no inline KaTeX scripts in WebView, fallback to plain text on error
- Added `src/utils/katexUtils.ts` and `src/utils/katexCss.ts` with `renderLatex()`, `stripDelimiters()`, `KATEX_CSS` for shared local KaTeX rendering
- Fixed `FormulasScreen.tsx`: list `ScrollView` now has `style={{ flex: 1 }}` to prevent collapse inside `scroll={false}` ExpressiveScreen
- Fixed `FormulasSubjectScreen.tsx`: same `flex: 1` fix on content `ScrollView`
- Fixed `FlashcardReviewScreen.tsx`: added `safeIdx` bounds clamp to prevent `card` being `undefined` when `idx` exceeds array length
- Fixed `QuizSessionScreen.tsx`: added `safeIdx` bounds clamp to prevent `question` crash when `idx` out of range
- Fixed `QuizResultsScreen.tsx`: resolved `subjectId` variable shadowing bug with `paramSubjectId` — typecheck now passes cleanly
- Typecheck confirms zero errors across all 7 rewritten screens

### In Progress
- (none — waiting on user direction)

### Blocked
- BFF `speak` mutation returns `{ audioUrl: "", duration: 0 }` placeholder — no app calls it (mobile uses `expo-speech`, web uses Web Speech API), so lowest priority

## Key Decisions
- Execute Python implemented as sandboxed JS evaluator (matching web approach), not server-side Python runtime
- YouTube transcript is dead code — removed from all projects instead of being ported
- Study section screens must mirror web functionality but with mobile-native interactions
- `FormulaRenderer` uses dynamic WebView height (injected `postMessage`) instead of fixed 64px — prevents clipping tall formulas
- All `scroll={false}` screens MUST pass `contentStyle={{ padding: 0, gap: 0 }}` to ExpressiveScreen — otherwise the default `padding: 16, gap: 24` breaks nested flex layouts by consuming space and adding gaps between children
- `termData.ts` switched from module-level `const YEAR` to `getTermData(year: number)` — term dates computed from the actual date passed to `getTermInfo`, not module load time
- KaTeX rendering switched from CDN WebView script to local npm `katex` package using `katex.renderToString()` on the JS thread — eliminates CDN dependency and WebView script execution, formulas pre-rendered as static HTML with embedded CSS

## Next Steps
1. Typecheck confirms zero errors in Mobile
2. Restart Metro bundler with `npx expo start --clear` to flush old cache before testing
3. Build/test on device or simulator to verify all fixes visually
4. Consider checking remaining study screens: PomodoroScreen, FocusScreen, WhiteboardScreen
5. TTS placeholder can be wired when a server-side TTS service (ElevenLabs, Google Cloud TTS) is integrated

## Relevant Files
- `/Users/shrravan/Documents/Analogix/AnalogixGraphQL/src/resolvers/room.ts` (line 200): `leaveRoom` now publishes `roomPresenceStream` with `isOnline: false`
- `/Users/shrravan/Documents/Analogix/AnalogixGraphQL/src/resolvers/flashcard.ts`: `normalizeGenerateFlashcardsInput` passes `setId` through, `generateFlashcards` inserts `set_id`
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/utils/termData.ts`: `TERM_DATA` → `getTermData(year)`, `getTermInfo` calls with `date.getFullYear()`
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/components/FormulaRenderer.tsx`: MutationObserver + ResizeObserver height tracking, explicit WebView props, CDN preconnect
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/screens/study/FormulasSubjectScreen.tsx`: Restructured layout, removed nested ScrollView
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/screens/study/QuizSessionScreen.tsx`: contentStyle={{ padding: 0, gap: 0 }}, flat flex layout
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/screens/study/FlashcardReviewScreen.tsx`: contentStyle={{ padding: 0, gap: 0 }}, clean layout
- `/Users/shrravan/Documents/Analogix/AnalogixMobile/src/screens/study/CalendarScreen.tsx`: Improved month cell styling, reused contentStyle fix
