# AI Memory & Personality Feature

This adds **ChatGPT-style memory and customizable personality** to your Analogix AI tutor.

## Features

### 🎭 AI Personality Editor
Users can customize how the AI behaves and teaches:

- **Personality Traits** (0-100 sliders):
  - Friendliness (Reserved ↔ Warm)
  - Formality (Casual ↔ Formal)
  - Humor (Serious ↔ Playful)
  - Detail Level (Brief ↔ Thorough)
  - Patience (Quick ↔ Patient)
  - Encouragement (Direct ↔ Supportive)

- **Teaching Style**:
  - Socratic Method (ask guiding questions)
  - Step-by-Step Solutions
  - Real-World Examples

- **Response Preferences**:
  - Use Emojis
  - Use Analogies (with frequency control 0-5)

- **Custom Instructions**:
  - Persona Description (e.g., "Be like a friendly older sibling")
  - Additional Instructions (e.g., "Always use metric units")

- **Presets**: Quick-apply personality templates:
  - Friendly Tutor
  - Strict Professor
  - Casual Study Buddy
  - Concise Expert

### 🧠 AI Memory System
The AI can remember things about the user across conversations:

- **Memory Types**:
  - Facts (things the user told the AI)
  - Preferences (user's likes/dislikes)
  - Skills (what the user is good at)
  - Goals (user's learning objectives)
  - Context (past conversation context)

- **Memory Management**:
  - View all memories
  - Search memories
  - Filter by type
  - Mark as important
  - Delete individual memories
  - Clear all memories

- **Auto-Context**: Memories are automatically injected into AI conversations

## Setup Instructions

### 1. Run Database Migration

Apply the Supabase migration to create the necessary tables:

```bash
# In your Supabase project, run:
supabase/migrations/add_ai_memory_personality.sql
```

Or manually run the SQL in your Supabase SQL Editor.

### 2. Access the Features

**To edit AI Personality:**
1. Open the app
2. Click on your profile (top-right or sidebar)
3. Click the "AI Personality" tab
4. Adjust sliders and options
5. Click "Save Changes"

**To manage AI Memory:**
1. Open the app
2. Click on your profile
3. Click the "AI Memory" tab
4. View, search, add, or delete memories
5. Click "Save Memory" to add new ones

## File Structure

```
src/
├── app/api/ai/
│   ├── personality/route.ts    # GET/PUT personality settings
│   └── memory/route.ts         # GET/POST/DELETE memories
├── components/
│   ├── PersonalityEditor.tsx   # Personality settings UI
│   └── MemoryManager.tsx       # Memory management UI
├── hooks/
│   └── useAIPersonality.ts     # React hooks for personality/memory
├── lib/
│   └── aiMemory.ts             # Server-side memory utilities
├── types/
│   └── ai-personality.ts       # TypeScript types
└── components/
    └── ProfileSheet.tsx        # Updated with tabs
```

## Database Schema

### `ai_personalities` table
Stores user's AI personality configuration (one row per user)

### `ai_memory_fragments` table
Stores individual memory fragments with:
- Content
- Type (fact, preference, skill, goal, context)
- Importance score (0-1)
- Reinforcement count

### `ai_memory_summaries` table
Stores condensed summaries of past conversations

## API Endpoints

### Personality
- `GET /api/ai/personality` - Get current personality
- `PUT /api/ai/personality` - Update personality

### Memory
- `GET /api/ai/memory` - Get all memories
- `POST /api/ai/memory` - Add new memory
- `DELETE /api/ai/memory?id=...` - Delete memory
- `PUT /api/ai/memory?id=...` - Update memory importance

## How It Works

1. **Personality**: When a user chats, the API fetches their personality settings and injects custom instructions into the system prompt.

2. **Memory**: Important memories are fetched and added to the system prompt as context, so the AI "remembers" things about the user.

3. **Integration**: Both personality and memory work seamlessly with existing features (analogies, curriculum context, etc.)

## Example Memory Context

When the AI responds, it sees something like:

```
--- WHAT I REMEMBER ABOUT YOU ---
📚 Facts I know about you:
• I learn better with visual diagrams
• I struggle with quadratic equations

⭐ Your preferences:
• I prefer step-by-step explanations
• I like real-world examples

🎯 Your goals:
• I want to improve my calculus grade
--- END MEMORY ---
```

## Future Enhancements

- [ ] Auto-extract memories from conversations
- [ ] Memory importance auto-adjustment based on usage
- [ ] Conversation summarization for long-term memory
- [ ] Export/import personality settings
- [ ] Share personality presets
- [ ] Memory suggestions based on conversation patterns

## Troubleshooting

**Memories not showing?**
- Check Supabase RLS policies
- Ensure user is authenticated
- Check browser console for errors

**Personality not saving?**
- Verify database migration ran
- Check API route logs
- Ensure user has a row in `ai_personalities`

**AI not using personality?**
- Personality only applies to NEW conversations
- Check that personality settings are being fetched
- Verify system prompt includes personality section
