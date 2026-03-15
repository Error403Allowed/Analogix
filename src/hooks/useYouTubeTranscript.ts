import { useState, useCallback } from "react";
import { toast } from "sonner";

interface YouTubeTranscriptResult {
  success: boolean;
  videoId: string;
  title: string;
  channelTitle?: string;
  duration?: string;
  transcript: string;
  description?: string;
}

interface UseYouTubeTranscriptReturn {
  loading: boolean;
  error: string | null;
  result: YouTubeTranscriptResult | null;
  fetchTranscript: (url: string) => Promise<void>;
  reset: () => void;
}

export function useYouTubeTranscript(): UseYouTubeTranscriptReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YouTubeTranscriptResult | null>(null);

  const fetchTranscript = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch transcript");
      }

      setResult(data);
      toast.success(`Transcript fetched: "${data.title}"`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "Failed to fetch YouTube transcript");
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
