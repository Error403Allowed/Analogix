import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarIntegrations, saveCalendarIntegration } from "@/lib/server/agents";

export const runtime = "nodejs";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/agents/calendar/callback";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "connect" && url.searchParams.get("provider") === "google") {
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ");

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID || "");
    authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return NextResponse.redirect(authUrl.toString());
  }

  if (action === "disconnect") {
    const provider = url.searchParams.get("provider");
    if (!provider) return NextResponse.json({ error: "Provider required" }, { status: 400 });

    const { error } = await supabase
      .from("calendar_integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: `Disconnected ${provider} calendar` });
  }

  const integrations = await getCalendarIntegrations(user.id);
  return NextResponse.json({ integrations });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!code) {
      return NextResponse.json({ error: "Authorization code required" }, { status: 400 });
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || "",
        client_secret: GOOGLE_CLIENT_SECRET || "",
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return NextResponse.json({ error: tokens.error_description || tokens.error }, { status: 400 });
    }

    await saveCalendarIntegration(
      user.id,
      "google",
      tokens.access_token,
      tokens.refresh_token,
      "primary",
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined
    );

    return NextResponse.json({ success: true, message: "Google Calendar connected" });
  } catch (error) {
    console.error("[agents/calendar] Error:", error);
    return NextResponse.json({ error: "Failed to connect calendar" }, { status: 500 });
  }
}

export async function syncCalendar(userId: string, provider: "google" | "apple") {
  const integrations = await getCalendarIntegrations(userId);
  const integration = integrations.find(i => i.provider === provider);

  if (!integration || !integration.sync_enabled) {
    return { success: false, error: "Calendar not connected" };
  }

  if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
    const refreshed = await refreshToken(userId, provider);
    if (!refreshed) {
      return { success: false, error: "Token expired" };
    }
  }

  const supabase = await createClient();

  if (provider === "google") {
    const eventsResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${integration.calendar_id}/events?maxResults=2500`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` },
      }
    );

    if (!eventsResponse.ok) {
      return { success: false, error: "Failed to fetch Google Calendar" };
    }

    const eventsData = await eventsResponse.json();
    const googleEvents = eventsData.items || [];

    for (const gEvent of googleEvents) {
      if (gEvent.status === "cancelled") continue;

      const existing = await supabase
        .from("events")
        .select("id")
        .eq("user_id", userId)
        .eq("google_event_id", gEvent.id)
        .maybeSingle();

      const eventData = {
        user_id: userId,
        title: gEvent.summary || "Untitled",
        date: gEvent.start?.dateTime || gEvent.start?.date || new Date().toISOString(),
        end_date: gEvent.end?.dateTime || gEvent.end?.date,
        type: gEvent.summary?.toLowerCase().includes("exam") ? "exam" : "event",
        description: gEvent.description,
        location: gEvent.location,
        google_event_id: gEvent.id,
        source: "google",
      };

      if (existing) {
        await supabase.from("events").update(eventData).eq("id", existing.id);
      } else {
        await supabase.from("events").insert(eventData);
      }
    }

    return { success: true, synced: googleEvents.length };
  }

  return { success: false, error: "Provider not supported" };
}

async function refreshToken(userId: string, provider: "google" | "apple"): Promise<boolean> {
  const integrations = await getCalendarIntegrations(userId);
  const integration = integrations.find(i => i.provider === provider);

  if (!integration?.refresh_token) return false;

  if (provider === "google") {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || "",
        client_secret: GOOGLE_CLIENT_SECRET || "",
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokens = await response.json();

    if (tokens.access_token) {
      await saveCalendarIntegration(
        userId,
        provider,
        tokens.access_token,
        integration.refresh_token,
        integration.calendar_id || "primary",
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined
      );
      return true;
    }
  }

  return false;
}

export async function pushToCalendar(
  userId: string,
  provider: "google" | "apple",
  event: { title: string; date: string; endDate?: string; description?: string }
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const integrations = await getCalendarIntegrations(userId);
  const integration = integrations.find(i => i.provider === provider);

  if (!integration) {
    return { success: false, error: "Calendar not connected" };
  }

  if (provider === "google") {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${integration.calendar_id}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: { dateTime: event.date, timeZone: "Australia/Sydney" },
          end: {
            dateTime: event.endDate || event.date,
            timeZone: "Australia/Sydney",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const created = await response.json();
    return { success: true, externalId: created.id };
  }

  return { success: false, error: "Provider not supported" };
}