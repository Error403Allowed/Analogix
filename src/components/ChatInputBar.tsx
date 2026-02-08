import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Square } from "lucide-react";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onKeyDownCapture: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  isTyping: boolean;
  isAnimating: boolean;
}

const ChatInputBar = ({
  value,
  onChange,
  onSubmit,
  onStop,
  onKeyDownCapture,
  inputRef,
  isTyping,
  isAnimating
}: ChatInputBarProps) => {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-[90] px-4 pointer-events-none">
      <div className="max-w-4xl mx-auto glass-card p-4 bg-background/80 backdrop-blur-xl border border-white/20 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.35)] pointer-events-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex gap-3 items-end"
        >
          <Textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDownCapture={onKeyDownCapture}
            placeholder="Ask me anything about this subject..."
            className="flex-1 glass border-border resize-none leading-relaxed min-h-[44px] max-h-[180px]"
            rows={1}
          />
          {(isTyping || isAnimating) ? (
            <Button
              type="button"
              onClick={onStop}
              className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 h-11"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!value.trim()}
              className="gap-2 gradient-primary text-primary-foreground border-0 h-11"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Quizzy can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};

export default ChatInputBar;
