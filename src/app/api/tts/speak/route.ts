import { NextResponse } from "next/server";

/**
 * Simple text-to-speech endpoint
 * Note: For production, use a proper TTS service like ElevenLabs, Google TTS, or AWS Polly
 * This endpoint returns the text formatted for client-side speech synthesis
 */
export async function POST(request: Request) {
  try {
    const { text, voice = "default", rate = 1.0, pitch = 1.0 } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Return the text with metadata for client-side synthesis
    // The actual audio generation happens in the browser using SpeechSynthesis API
    return NextResponse.json({
      success: true,
      text,
      options: {
        voice,
        rate: Math.max(0.5, Math.min(2.0, rate)),
        pitch: Math.max(0.5, Math.min(2.0, pitch)),
      },
      // Estimate duration (average speaking rate is ~150 words per minute)
      estimatedDurationSeconds: Math.ceil(text.split(/\s+/).length / 150 * 60),
    });

  } catch (error: any) {
    console.error("[/api/tts/speak] Error:", error.message);
    return NextResponse.json({ error: error.message || "TTS service unavailable" }, { status: 500 });
  }
}
