import { useState, useCallback } from "react";

interface YouTubeTranscriptResult {
  success: boolean;
  videoId: string;
  title: string;
  channelTitle?: string;
  duration?: string;
  transcript: string;
}

interface UseYouTubeTranscriptReturn {
  loading: boolean;
  error: string | null;
  result: YouTubeTranscriptResult | null;
  fetchTranscript: (url: string) => Promise<void>;
  reset: () => void;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function useYouTubeTranscript(): UseYouTubeTranscriptReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YouTubeTranscriptResult | null>(null);

  const fetchTranscript = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }

      const response = await fetch(
        `https://yt-transcript-api.vercel.app/api/transcript?videoId=${videoId}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) {
        throw new Error(`Transcript API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.transcript || !Array.isArray(data.transcript)) {
        throw new Error("No transcript available for this video");
      }

      const transcript = data.transcript
        .map((segment: any) => segment.text)
        .filter(Boolean)
        .join(" ");

      setResult({
        success: true,
        videoId,
        title: data.title || "YouTube Video",
        duration: data.duration,
        transcript,
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch YouTube transcript");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { loading, error, result, fetchTranscript, reset };
}
