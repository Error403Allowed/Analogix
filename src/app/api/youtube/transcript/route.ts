import { NextResponse } from "next/server";
import { extractYouTubeVideoId, fetchYouTubeTranscript, fetchYouTubeVideoInfo } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Fetch both transcript and video info in parallel
    const [transcriptData, videoInfo] = await Promise.all([
      fetchYouTubeTranscript(videoId),
      fetchYouTubeVideoInfo(videoId),
    ]);

    if (!transcriptData) {
      return NextResponse.json({ 
        error: "Could not fetch transcript. This video may not have captions enabled.",
        videoInfo: videoInfo || undefined,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      videoId,
      title: transcriptData.title || videoInfo?.title || "YouTube Video",
      channelTitle: videoInfo?.channelTitle,
      duration: transcriptData.duration,
      transcript: transcriptData.transcript,
      description: videoInfo?.description,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/youtube/transcript] Error:", message);
    return NextResponse.json({ error: message || "Failed to fetch YouTube transcript" }, { status: 500 });
  }
}
