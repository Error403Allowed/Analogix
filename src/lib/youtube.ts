/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch YouTube video transcript using a public API
 * Returns the transcript text or null if unavailable
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<{ transcript: string; title: string; duration?: string } | null> {
  try {
    // Using a public transcript API service
    const response = await fetch(`https://yt-transcript-api.vercel.app/api/transcript?videoId=${videoId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Transcript API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.transcript || !Array.isArray(data.transcript)) {
      return null;
    }

    // Combine transcript segments
    const transcript = data.transcript
      .map((segment: any) => segment.text)
      .filter(Boolean)
      .join(" ");

    return {
      transcript,
      title: data.title || "YouTube Video",
      duration: data.duration,
    };
  } catch (error) {
    console.error("[YouTube Transcript] Error:", error);
    return null;
  }
}

/**
 * Fetch YouTube video metadata (title, description, etc.)
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<{ title: string; description: string; channelTitle?: string } | null> {
  try {
    // Using noembed service for basic video info
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      title: data.title || "YouTube Video",
      description: data.description || "",
      channelTitle: data.author_name,
    };
  } catch (error) {
    console.error("[YouTube Info] Error:", error);
    return null;
  }
}
