# Debugging "Failed to Fetch" Errors

This guide helps you resolve the "Failed to fetch" errors in your Analogix application.

## Quick Diagnostics

### 1. Check Environment Variables

Run this in your Next.js API route or server component:

```bash
curl http://localhost:3000/api/health
```

This will show you which environment variables are missing or misconfigured.

### 2. Required Environment Variables

Your `.env.local` file should include:

```env
# Groq API (Required for AI features)
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_KEY_2=optional_second_key_for_fallback

# Supabase (Required for auth and database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Admin (Required for account deletion and admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ Important:** The `NEXT_PUBLIC_*` variables must be in your `.env.local` file to be accessible in the browser. The `SUPABASE_SERVICE_ROLE_KEY` must be kept secret and only used server-side.

## Common Causes of "Failed to Fetch"

### Cause 1: Missing Environment Variables

**Symptoms:**
- API requests return `Failed to fetch`
- Health check endpoint shows missing variables
- Console shows `undefined` API keys

**Solution:**
1. Verify `.env.local` exists in the project root
2. Check that all required variables are set (see above)
3. Restart the Next.js dev server with `npm run dev`

### Cause 2: Network Connectivity Issues

**Symptoms:**
- Works on some networks but not others
- CORS-related errors in console
- Requests timeout after 30 seconds

**Solution:**
1. Check your network connection
2. Try disabling VPN/proxy temporarily
3. Check if your ISP is blocking external requests
4. The app now has automatic retry logic (2 retries with exponential backoff)

### Cause 3: API Service Down

**Symptoms:**
- All API requests fail with 5xx errors
- External API appears to be unavailable
- Error message shows HTTP 503 or 504

**Solution:**
1. Check Groq API status (https://status.groq.com)
2. Check Supabase status (https://status.supabase.com)
3. The app will now show clearer error messages
4. Future requests will automatically retry

### Cause 4: Timeout Issues

**Symptoms:**
- Requests take >30 seconds and fail
- Error message includes "(Timeout)"
- Happens with slow network connections

**Solution:**
1. Check your internet speed
2. The app now supports timeout configuration per request type
3. Some endpoints may need longer timeout (e.g., AI requests)

## New Error Handling Features

The following improvements have been added:

### 1. Automatic Retries
- Network failures automatically retry 2 times
- Exponential backoff between retries (1s, 2s)
- Timeout errors don't retry (already waiting)

### 2. Better Error Messages
- Distinguishes between network errors, timeouts, and API errors
- Shows HTTP status codes
- Includes error details from API responses

### 3. Health Check Endpoint
- `GET /api/health` returns environment status
- Shows which variables are missing
- Can be used by monitoring tools

### 4. Type-Safe Error Handling
The new `fetchWithRetry` function returns a result object:

```typescript
const result = await fetchWithRetry<MyType>(url, options);

if (result.ok) {
  console.log(result.data);
} else {
  console.error(result.error);
  console.log(result.isNetworkError ? 'Network problem' : 'Server error');
}
```

## Debugging Steps

### Step 1: Check Health Endpoint
```bash
curl -i http://localhost:3000/api/health
```

Look for which environment variables are missing.

### Step 2: Check API Logs
```bash
npm run dev
```

The terminal will show:
- Which requests are being made
- Response status codes
- Timeout errors
- Network errors

### Step 3: Check Browser Console
Open DevTools (F12) → Console tab to see:
- Fetch errors with detailed messages
- Network tab to check request/response headers
- Application tab to see environment variables

### Step 4: Test Specific Endpoint
```bash
curl -X POST http://localhost:3000/api/hf/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [], "userContext": {}}'
```

### Step 5: Check Network Settings
```bash
# Verify DNS is working
nslookup api.groq.com

# Verify network connectivity
curl -I https://api.groq.com

# Check Supabase connectivity
curl -I https://your-project.supabase.co
```

## Service-Specific Issues

### Groq API Failures
- Check `GROQ_API_KEY` is valid
- Verify API key hasn't exceeded rate limits
- Check Groq status page

### Supabase Auth Failures
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check browser console for CORS errors
- Ensure Supabase project is active

### Supabase Admin Operations
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Account deletion requires this key
- Never expose this key in browser code

## Recovery Tips

1. **Restart the dev server**: `npm run dev`
2. **Clear browser cache**: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
3. **Check .env.local**: Ensure all variables are set
4. **Verify network**: Ping external services to confirm connectivity
5. **Check logs**: Look at terminal output from `npm run dev`

## Testing

To test error handling:

```typescript
import { fetchWithRetry } from '@/lib/fetch-wrapper';

// This will retry and show clear error messages
const result = await fetchWithRetry(url, { maxRetries: 2 });

if (result.ok) {
  console.log('Success:', result.data);
} else {
  if (result.isNetworkError) console.log('Network error - check internet');
  if (result.isTimeoutError) console.log('Request took too long');
  console.error('Error:', result.error);
}
```

## Getting Help

If issues persist:
1. Run health check: `curl http://localhost:3000/api/health`
2. Share the health check output
3. Check `.env.local` is properly configured
4. Review API key validity
5. Check for CORS issues in browser DevTools
