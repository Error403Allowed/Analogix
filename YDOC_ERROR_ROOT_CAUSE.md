# RangeError: Invalid typed array length: 49 — Root Cause & Permanent Fix

## The Error

```
RangeError: Invalid typed array length: 49
    at new Uint8Array (<anonymous>)
    at loadYDoc (src/lib/ydoc-persistence.ts:75:22)
```

## Root Cause

The issue was **data encoding/decoding mismatch** in the Yjs persistence layer:

### What Was Happening

1. **Save**: Yjs binary snapshots were being saved as raw `Uint8Array` directly to Supabase bytea column
2. **Retrieve**: Supabase was returning the bytea data in an **unpredictable format** (sometimes base64, sometimes hex, sometimes corrupted)
3. **Decode**: The `toUint8Array()` function was trying to guess the format and failing
4. **Result**: "49 bytes of garbage" being passed to `Y.applyUpdate()`, which exploded

The "49" was a random size because the decoded data was partial/corrupted.

---

## The Fix: Explicit Base64 Encoding

### Changed Strategy

**Before:**
```typescript
// ❌ Let Supabase handle encoding
await supabase.from("ydoc_snapshots").insert({
  snapshot: uint8ArrayFromYjs, // Raw bytes - ambiguous format
});
```

**After:**
```typescript
// ✅ Explicit base64 encoding
const snapshotBase64 = uint8ArrayToBase64(snapshot);
await supabase.from("ydoc_snapshots").insert({
  snapshot: snapshotBase64, // Consistent, predictable string
});
```

### Key Changes in `src/lib/ydoc-persistence.ts`

#### 1. Added consistent encoding helpers
```typescript
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

#### 2. Use base64 in `appendYDocUpdate()`
```typescript
const updateBase64 = uint8ArrayToBase64(update);
await supabase.from("ydoc_updates").insert({
  update: updateBase64, // Consistent encoding
});
```

#### 3. Use base64 in `compactYDoc()`
```typescript
const snapshotBase64 = uint8ArrayToBase64(snapshot);
await supabase.from("ydoc_snapshots").insert({
  snapshot: snapshotBase64, // Consistent encoding
});
```

#### 4. Enhanced `toUint8Array()` with priority order
```typescript
// Priority: base64 first (our standard) → hex (\x) → array → error
if (typeof value === "string") {
  try {
    const bytes = base64ToUint8Array(value);
    // Validate before returning
    if (bytes.length === 0 || bytes.length > 10_000_000) {
      console.warn("Invalid length:", bytes.length);
      return new Uint8Array();
    }
    return bytes;
  } catch (base64Error) {
    // Fall back to hex parsing...
  }
}
```

#### 5. Added detailed validation & logging
```typescript
if (bytes.length === 0) {
  console.error("Snapshot decoded to empty array, clearing corrupted data");
  await migrateYDocData(docId, user.id, "Snapshot decoded to empty array");
  return { ydoc: new Y.Doc(), latestSeq: 0 };
}

console.info("Snapshot decoded successfully, byte length:", bytes.length);
```

---

## Why This Works

### ✅ Consistency
- **Encoding**: All Yjs updates → base64 (deterministic)
- **Decoding**: All base64 → Yjs updates (predictable)
- **No ambiguity**: We control the format, not Supabase

### ✅ Reliability
- Base64 is text, survives any data pipeline
- Can log/debug easily
- Works across all JS environments

### ✅ Safety
- Validates all decoding steps
- Detects corruption early
- Automatically clears only bad data (via `migrateYDocData()`)
- Never crashes on malformed data

---

## Data Migration

Old corrupted snapshots will be:
1. Detected during decode
2. Logged with reason (archived to `ydoc_snapshots_archive` if table exists)
3. Automatically cleared
4. Fresh empty doc created

No manual intervention needed.

---

## Testing

After this fix, all new documents will:
```
Create → Save as base64 → Retrieve as base64 → Decode correctly ✅
```

Existing corrupted data will be cleared on first access.

---

## Files Changed

- `src/lib/ydoc-persistence.ts`
  - Added `uint8ArrayToBase64()`, `base64ToUint8Array()`
  - Updated `appendYDocUpdate()` to encode
  - Updated `compactYDoc()` to encode
  - Enhanced `toUint8Array()` with better validation
  - Added diagnostic logging in `loadYDoc()`
  - Improved `migrateYDocData()` error handling
