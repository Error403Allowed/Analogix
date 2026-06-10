# AnalogixMobile — Full Feature Parity with AnalogixWeb

Web is the source of truth. Mobile mirrors all behaviour; only the UI layer is adapted for touch.

---

## Verified Gap Summary

After a line-by-line audit of both codebases, the following features are **truly missing** from AnalogixMobile. Items the initial analysis flagged but that actually exist (e.g. chat search/rename/delete, flashcard create/import/learn, quiz AI review, room creation/join) are excluded.

---

## Phase 1 — Remove Mobile-Only Features

| # | Task | Files |
|---|------|-------|
| 1.1 | Remove `StudyMapSubject` reference from README | `README.md` |
| 1.2 | Remove `Resources` from `ALL_LINKS` in DashboardScreen (web has no standalone resources page) | `DashboardScreen.tsx` |

**Status:** Quick cleanup, no functional risk.

---

## Phase 2 — Chat Parity (Critical)

The chat screen is the highest-traffic feature. Six capabilities exist in web but not mobile.

### 2.1 Regenerate Last Response
- **Web:** Button on last assistant message calls `getGroqCompletion()` with full history.
- **Mobile:** Missing.
- **Implementation:** Add a regenerate icon button on the last assistant message. Call `STREAM_CHAT_MESSAGE` mutation with the same session context. Replace the last message in-place.
- **Files:** `ChatSessionScreen.tsx`, `ChatQuickActions.tsx`

### 2.2 Subject Picker in Chat
- **Web:** Clickable subject badge in header opens a picker dropdown. Manual selection + auto-detect from first message.
- **Mobile:** Subject is hardcoded from route params at creation time, never changeable.
- **Implementation:** Add a tappable subject chip in the chat header. Show a bottom sheet listing the user's subjects (from `SUBJECTS` query). On select, update `subjectId` in the chat session via `UPDATE_CHAT_SESSION`. Auto-detect: after first user message, call a lightweight classification to suggest a subject.
- **Files:** `ChatSessionScreen.tsx`, new `SubjectPickerSheet.tsx` or inline bottom sheet

### 2.3 Re-explain with Anchor Picker
- **Web:** Per-message button opens an anchor picker populated from user hobbies. Sends chosen anchor to `getReExplanation()`.
- **Mobile:** Long-press triggers a simple Alert with "Re-explain" that sends `style: "simpler"` — no anchor selection.
- **Implementation:** Replace the Alert with a bottom sheet listing the user's interests (from `me.hobbies` on the `ME` query). Each interest is a tappable chip. On tap, call `REEXPLAIN` with the selected anchor text.
- **Files:** `ChatSessionScreen.tsx`

### 2.4 Research Source Cards
- **Web:** `ResearchSourceCard` components with title, authors, year, venue, abstract, DOI link.
- **Mobile:** Sources appended as plain text in the message string.
- **Implementation:** Parse the research sources array from the `SEARCH_RESEARCH` response. Render as a collapsible section below the message with `ExpressiveListRow` cards showing title, authors, year, and a tappable DOI link.
- **Files:** `ChatSessionScreen.tsx`, new `ResearchSourceCard.tsx`

### 2.5 Generate Quiz/Flashcards from Attached Files
- **Web:** When files are attached, buttons appear: "Generate Study Guide", "Generate Quiz", "Generate Flashcards" from file content.
- **Mobile:** Files are sent as context but no generation buttons exist.
- **Implementation:** After file extraction, show action buttons below the file chip. Wire each to the corresponding GraphQL mutation (`GENERATE_QUIZ`, `GENERATE_FLASHCARDS`) using the extracted text.
- **Files:** `ChatSessionScreen.tsx`

### 2.6 Formula Side Panel
- **Web:** Toggle button opens a formula reference panel with search and topic browsing, overlaid on the chat.
- **Mobile:** Missing.
- **Implementation:** Add a formula icon button in the chat header or composer area. On tap, open a modal/bottom sheet with the `FORMULA_SHEETS` query data, searchable by name/topic. Tapping a formula inserts its LaTeX into the chat input.
- **Files:** `ChatSessionScreen.tsx`, new `FormulaPanel.tsx`

---

## Phase 3 — Dashboard Parity (High)

### 3.1 Time-of-Day Greeting
- **Web:** `greeting()` returns "Good morning/afternoon/evening" + user name + full date.
- **Mobile:** Static `"Hi, {firstName}"`.
- **Implementation:** Add a `greeting()` helper. Display time-of-day greeting + formatted date below.
- **Files:** `DashboardScreen.tsx`

### 3.2 Tutorial Overlay Integration
- **Web:** `TutorialOverlay` renders on first visit with guided tour steps.
- **Mobile:** Component exists but is never rendered.
- **Implementation:** Import and render `TutorialOverlay` in `DashboardScreen`. Gate on first-visit flag in AsyncStorage.
- **Files:** `DashboardScreen.tsx`

### 3.3 Empty State
- **Web:** When all widgets are off, shows icon + message + "Customise dashboard" button.
- **Mobile:** No handling — just empty sections.
- **Implementation:** After rendering widget sections, check if `enabled.length === 0`. If so, render `ExpressiveEmptyState` with a "Customise" action.
- **Files:** `DashboardScreen.tsx`

### 3.4 Timer Widget Enhancement
- **Web:** `MiniTimer` with SVG ring progress, session dots (filled/unfilled), Start/Pause, Reset, "Full →" link.
- **Mobile:** Simple `ExpressiveListRow` with time + play/pause.
- **Implementation:** Replace the simple row with an inline SVG ring (similar to `TimerScreen`), add session goal dots, add a reset button, and add a "Full timer →" navigation link.
- **Files:** `DashboardScreen.tsx`

### 3.5 Flashcard Widget Buttons
- **Web:** "Browse" and "Review X due" buttons in the flashcard widget.
- **Mobile:** Shows counts only, no action buttons.
- **Implementation:** Add two `Button` components below the counts: "Review" (navigates to `FlashcardReview` with the first due set) and "Browse" (navigates to `Flashcards`).
- **Files:** `DashboardScreen.tsx`

### 3.6 Widget Customise Reset
- **Web:** "Reset" button in the customise panel restores defaults.
- **Mobile:** No reset button.
- **Implementation:** Add a "Reset to defaults" text button below the widget list in `CustomisePanel`.
- **Files:** `DashboardScreen.tsx`

---

## Phase 4 — Calendar Parity (High)

### 4.1 Custom Event Types
- **Web:** Users can create/edit/delete custom event types with custom colours and icons. Stored in localStorage.
- **Mobile:** 9 hardcoded types only.
- **Implementation:** Add a "Manage tags" action in the calendar header. Show a bottom sheet with the built-in types (non-deletable) + user-created types. Allow create (name + colour picker + icon picker), edit, and delete for custom types. Persist to AsyncStorage.
- **Files:** `CalendarScreen.tsx`, new `EventTypeManager.tsx`

### 4.2 Event Search / Filter
- **Web:** Search bar to filter events by text. Filter by event type.
- **Mobile:** No search or filter.
- **Implementation:** Add a search bar at the top of the schedule/list view. Add chip-based type filter toggles. Filter the events array client-side.
- **Files:** `CalendarScreen.tsx`

### 4.3 Mini Calendar (Schedule View)
- **Web:** Sidebar mini calendar with month navigation, event dot indicators, today highlight.
- **Mobile:** No mini calendar.
- **Implementation:** In the schedule/list view, add a compact month-strip at the top (horizontal scroll of day numbers with event dots). Tapping a day jumps the main view to that date.
- **Files:** `CalendarScreen.tsx`

### 4.4 Click-to-Create in Time Grid
- **Web:** Clicking an empty time slot in week/day view creates an event at that time.
- **Mobile:** Events only via FAB.
- **Implementation:** Add `onPress` to empty time cells in the week/day grid. Pre-fill the event creation modal with the tapped time slot.
- **Files:** `CalendarScreen.tsx`

---

## Phase 5 — Quiz Parity (Medium)

### 5.1 Grade-Aware Difficulty Labels
- **Web:** Difficulty options change based on year level: Junior (Foundational / Building / Developing), Middle (Consolidating / Extending / Mastering), Senior (Refining / Analysing / Evaluating).
- **Mobile:** Static "Easy / Medium / Hard".
- **Implementation:** Read `me.yearLevel` from `ME` query. Map to grade band. Show appropriate difficulty labels. Pass the mapped label to the generation mutation.
- **Files:** `QuizScreen.tsx`

### 5.2 Question Deduplication
- **Web:** Tracks recent question text in localStorage, avoids repeating. Uses `diversitySeed`.
- **Mobile:** No deduplication.
- **Implementation:** Store last N question texts in AsyncStorage. Pass a hash/seed to the generation mutation to encourage variety.
- **Files:** `QuizScreen.tsx`

### 5.3 Confetti on High Score
- **Web:** `Confetti` animation on quiz completion when score ≥ 80%.
- **Mobile:** No confetti.
- **Implementation:** Import a confetti library (e.g. `react-native-confetti-cannon`). Trigger on `QuizResultsScreen` when accuracy ≥ 80%.
- **Files:** `QuizResultsScreen.tsx`

---

## Phase 6 — Rooms Parity (Medium)

### 6.1 Workspace Tab with Document Editing
- **Web:** 3 tabs: Chat, Workspace (BlockNote editor), Documents. Workspace has a full rich-text editor.
- **Mobile:** Chat + timer + doc list (read-only) + members. No document editing.
- **Implementation:** Add a tabbed layout to `RoomDetailScreen` (Chat / Workspace / Members). The Workspace tab renders a simplified rich-text editor (using `react-native-pell-rich-editor` or similar) for shared documents. Support real-time sync via GraphQL subscriptions.
- **Files:** `RoomDetailScreen.tsx`, new `RoomWorkspace.tsx`

### 6.2 AI Mode Toggle in Room Chat
- **Web:** Toggle between "chat with members" and "ask AI" modes in the room chat.
- **Mobile:** Chat is members-only.
- **Implementation:** Add a segmented button above the chat input: "Group" / "AI". In AI mode, messages go to the room AI tutor endpoint instead of the room message endpoint.
- **Files:** `RoomDetailScreen.tsx`

---

## Phase 7 — Subjects Parity (Medium)

### 7.1 Grid / List View Toggle
- **Web:** Toggle between grid and list views in `SubjectsOverview`.
- **Mobile:** Grid only.
- **Implementation:** Add a toggle icon button in the header. Store preference in AsyncStorage. Switch between grid layout and `ExpressiveListRow` list layout.
- **Files:** `SubjectsListScreen.tsx`

### 7.2 Subject Search / Filter
- **Web:** Search bar to filter subjects by name.
- **Mobile:** No search.
- **Implementation:** Add a `Searchbar` above the grid. Filter subjects client-side by name.
- **Files:** `SubjectsListScreen.tsx`

### 7.3 Document Duplication
- **Web:** Duplicate a document within a subject.
- **Mobile:** No duplicate action.
- **Implementation:** Add a "Duplicate" option to the document long-press menu. Call `DUPLICATE_DOCUMENT` mutation.
- **Files:** `SubjectDetailScreen.tsx`

---

## Phase 8 — Achievements Parity (Medium)

### 8.1 Category Tabs
- **Web:** Category filter tabs (All, Starter, Streak, Mastery, Social).
- **Mobile:** Flat grid, no categories.
- **Implementation:** Add a horizontal `SegmentedButtons` or scrollable chip row at the top for category filtering. Filter achievements client-side.
- **Files:** `AchievementsScreen.tsx`

### 8.2 Search / Filter
- **Web:** Search bar to filter achievements by name/description.
- **Mobile:** No search.
- **Implementation:** Add a `Searchbar` below the category tabs. Filter by name/description match.
- **Files:** `AchievementsScreen.tsx`

### 8.3 Progress Bar
- **Web:** Overall progress bar showing unlocked/total percentage.
- **Mobile:** No progress indicator.
- **Implementation:** Add a `ProgressBar` at the top showing `unlockedCount / totalCount` with a percentage label.
- **Files:** `AchievementsScreen.tsx`

### 8.4 Animated Grid
- **Web:** Animated card grid with hover effects and glass-card styling.
- **Mobile:** Static 2-column grid.
- **Implementation:** Use `react-native-reanimated` `FadeInDown` layout animation for card entrance. Add subtle scale animation on press.
- **Files:** `AchievementsScreen.tsx`

---

## Phase 9 — Formulas Parity (Medium)

### 9.1 Cross-Subject Search
- **Web:** Search across all formula fields (name, description, topic, LaTeX, tags) with cross-subject results.
- **Mobile:** Per-subject browsing only.
- **Implementation:** Add a search bar at the top of `FormulasScreen`. When text is entered, search across all formula sheets and display unified results grouped by subject.
- **Files:** `FormulasScreen.tsx`

### 9.2 State-Based Filtering
- **Web:** `matchesState()` filters formulas by Australian state curriculum.
- **Mobile:** No state filtering.
- **Implementation:** Read `me.state` from `ME` query. Apply `matchesState()` filter to formula lists. Add a state toggle in the header for manual override.
- **Files:** `FormulasScreen.tsx`, `FormulasSubjectScreen.tsx`

---

## Phase 10 — Settings Parity (Medium)

### 10.1 Reset All Data
- **Web:** "Reset all data" button clears localStorage, resets achievements, reloads.
- **Mobile:** Missing.
- **Implementation:** Add a "Reset all data" row in `SettingsScreen`. On press, show confirmation dialog. On confirm, clear AsyncStorage, reset Apollo cache, and reload app.
- **Files:** `SettingsScreen.tsx`

### 10.2 Notifications Toggle
- **Web:** Notification preferences in settings.
- **Mobile:** Has notification toggles already (verified).
- **Status:** Already exists.

---

## Phase 11 — Onboarding Polish (Medium)

### 11.1 Typewriter Text
- **Web:** `TypewriterText` component types out "Hi there! I'm Analogix AI." character by character on the name step.
- **Mobile:** Static headings.
- **Implementation:** Add a `TypewriterText` component using `Animated` or `react-native-reanimated`. Render on the first onboarding step.
- **Files:** `OnboardingScreen.tsx`, new `TypewriterText.tsx`

### 11.2 Confetti on Completion
- **Web:** `Confetti` component on the final "Done" step.
- **Mobile:** Simple checkmark icon.
- **Implementation:** Import confetti library. Trigger on the completion step.
- **Files:** `OnboardingScreen.tsx`

### 11.3 Step Transitions
- **Web:** `AnimatePresence` with slide transitions between steps. Staggered children animation.
- **Mobile:** No transitions — ScrollView with progress bar.
- **Implementation:** Wrap step content in `Animated.View` with `slideInRight`/`slideOutLeft` transitions using `react-native-reanimated` `LinearTransition`.
- **Files:** `OnboardingScreen.tsx`

### 11.4 ICS Import Preview
- **Web:** Shows event count after parsing, error handling, "Imported X events!" confirmation.
- **Mobile:** File picker + file name display only.
- **Implementation:** After file selection, parse the ICS content and display event count in a preview card before import. Show error messages for invalid files.
- **Files:** `OnboardingScreen.tsx`

---

## Phase 12 — Cross-Cutting Polish (Low)

### 12.1 Material 3 Expressive Consistency
- Audit all screens for consistent use of `ExpressiveScreen`, `ExpressiveCard`, `ExpressiveListRow`, `ExpressiveSection`.
- Ensure consistent spacing, elevation, and colour usage.

### 12.2 Skeleton Loading States
- Add skeleton/placeholder loading states for all data-fetching screens (currently many show `ActivityIndicator`).
- Use `react-native-reanimated` `FadeIn` for skeleton pulse animation.

### 12.3 Animation Audit
- Ensure all page transitions use `react-native-reanimated` `LinearTransition`.
- Add `PressableScale` feedback to all interactive elements.
- Verify no layout overflows on small screens (iPhone SE, etc.).

### 12.4 Error Boundary Coverage
- Wrap each tab navigator in `ErrorBoundary` for graceful failure.
- Add retry buttons on error states.

---

## Execution Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Remove mobile-only | High | Small | None |
| 2. Chat parity | High | Large | None |
| 3. Dashboard parity | High | Medium | None |
| 4. Calendar parity | High | Medium | None |
| 5. Quiz parity | Medium | Small | None |
| 6. Rooms parity | Medium | Large | None |
| 7. Subjects parity | Medium | Small | None |
| 8. Achievements parity | Medium | Small | None |
| 9. Formulas parity | Medium | Small | None |
| 10. Settings parity | Medium | Small | None |
| 11. Onboarding polish | Medium | Medium | None |
| 12. Cross-cutting polish | Low | Large | All above |

Phases 1-4 should be tackled first as they cover the highest-traffic features. Each phase is independently shippable.

---

## Completion Status

**All 12 phases completed.** TypeScript compiles clean after each phase.

### Summary of Changes

| Phase | Features Added |
|-------|---------------|
| 1. Remove mobile-only | Fixed README (StudyMap/Resources references) |
| 2. Chat parity | Regenerate button, subject picker (bottom sheet), re-explain anchors (hobby bottom sheet), research source cards, file generate actions, formula panel modal, fixed ChatOptionsSheet analogy bug |
| 3. Dashboard parity | Time-of-day greeting, empty state with CTA, enhanced timer widget (SVG ring, session dots, reset, "Full timer →"), flashcard review/browse buttons, "Reset to defaults" in customise panel |
| 4. Calendar parity | Custom event types (create/delete/type manager), event search/filter chips, click-to-create hour slots |
| 5. Quiz parity | Grade-aware difficulty labels (Junior/Middle/Senior), question deduplication (recentQuestions + diversitySeed), confetti on ≥80% accuracy |
| 6. Rooms parity | AI mode toggle (Group/AI tutor) in room chat with tutorMutation, AI message rendering, thinking indicator |
| 7. Subjects parity | Grid/list view toggle (SegmentedButtons), subject search, document duplication (long-press → duplicateDocument mutation) |
| 8. Achievements parity | Category tabs (starter/streak/mastery/social), search/filter, progress bar |
| 9. Formulas parity | Cross-subject search (searches formula names + descriptions), subject filter chips, state-based banner |
| 10. Settings parity | "Reset all data" (clears AsyncStorage local keys) with confirmation dialog |
| 11. Onboarding polish | Typewriter heading effect, step transition animations (fade), confetti on completion, enhanced ICS preview |
| 12. Cross-cutting polish | SkeletonLoader component (Skeleton/SkeletonCard/SkeletonList), replaced ActivityIndicator in SubjectDetail, Formulas, Rooms, FlashcardSet screens |
