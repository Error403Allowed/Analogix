# Document Opening & Yjs Fixes - Summary

## ✅ Changes Implemented

### 1. **Unified Document Opening Behavior**
All entry points now use the same flow: open tab in TabsContext → navigate

**Files Modified:**
- `src/components/RecentDocs.tsx` - Now calls `openTab()` before `router.push()`
- `src/components/AppSidebar.tsx` - CommandMenu now calls `openTab()` for documents
- `src/components/TabBar.tsx` - Already had correct behavior

**Result:** Consistent experience across:
- Dashboard widgets (RecentDocs)
- Command menu (⌘K)
- New tab modal (TabBar)

### 2. **Fixed 409 Conflict on Snapshot Saves**
Changed from delete→insert to atomic upsert operation

**File Modified:**
- `src/lib/ydoc-persistence.ts` - `compactYDoc()` function

**Changes:**
- Uses `upsert()` with `onConflict: "doc_id"` for atomicity
- Fallback to delete→insert if upsert fails
- Better error handling that doesn't block the editor

**Result:** No more 409 Conflict errors when saving document snapshots

### 3. **Enhanced Error Handling**
- Compact errors no longer crash the editor
- Updates are preserved even if snapshot fails
- Better console logging for debugging

## 🔍 Console Messages Explained

### ✅ **Expected & Harmless:**
```
[collab] NEXT_PUBLIC_REALTIME_URL not set — using local-only sync
```
- This is INFO level, not an error
- Means: collaborative editing works locally (single device)
- To enable multiplayer: set `NEXT_PUBLIC_REALTIME_URL` in `.env.local`

### ✅ **Vercel Web Analytics Logs:**
```
[Vercel Web Analytics] [view] http://localhost:3000/...
```
- These are just analytics logging from Vercel SDK
- Completely harmless, can be ignored
- Normal in development

### ❌ **Previously Fixed:**
```
POST https://...ydoc_snapshots 409 (Conflict)
```
- **Status:** FIXED with upsert atomicity
- Was causing snapshot failures

## 📋 To-Do: Optional Realtime Multiplayer Setup

If you want multiplayer collaborative editing:

1. **Deploy the realtime server** (`realtime/` folder)
   ```bash
   cd realtime
   npm run build
   npm start
   ```

2. **Set environment variable** in `.env.local`:
   ```
   NEXT_PUBLIC_REALTIME_URL=wss://your-realtime-server.com
   REALTIME_JWT_SECRET=your-secret-key
   ```

3. **Redeploy Next.js** app to pick up new env var

Without this, multiplayer is disabled but documents still work perfectly for single users.

## 🧪 Testing Checklist

✅ Document opens from widgets (RecentDocs)
✅ Document opens from command menu (⌘K)  
✅ Document opens from new tab modal
✅ Tab updates correctly in TabsContext
✅ No 409 conflicts on save
✅ Snapshots persist correctly

## 🔧 Database Schema (Already Correct)

The database has:
- `ydoc_snapshots` table with UNIQUE constraint on `doc_id`
- `ydoc_updates` table for incremental changes
- Archive tables for debugging corrupted data

**Current Migration:** `supabase/migrations/fix_ydoc_snapshot_unique.sql`

If you see migration errors, run:
```bash
supabase migration list
supabase migration status
```
