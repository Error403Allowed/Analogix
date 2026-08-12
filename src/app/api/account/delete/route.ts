import { NextResponse } from "next/server";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export async function DELETE() {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in to delete your account." }, { status: 401 });
  }

  // Use the session client's admin API (via RLS + service function) or
  // delegate to a Supabase Edge Function for account deletion.
  // The service role key is NEVER loaded into a public API route.
  const { error: profileError } = await sessionClient.from("profiles").delete().eq("id", user.id);
  if (profileError) {
    console.error("[account/delete] Profile delete error:", profileError);
  }

  // Sign out locally - full auth user deletion requires admin API
  // which should be done via a Supabase Edge Function with the service role.
  await sessionClient.auth.signOut();

  return NextResponse.json({
    ok: true,
    message: "Profile deleted. Full account deletion requires an admin API call. Contact support if needed.",
  });
}
