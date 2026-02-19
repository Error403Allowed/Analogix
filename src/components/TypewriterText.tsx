import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypewriterTextProps {
  text: string;
  className?: string;
  delay?: number;
}

const TypewriterText = ({ text, className = "", delay = 0 }: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;

    const startTyping = () => {
      const typeNextChar = () => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          const char = text[charIndex - 1];
          const speed = char === " " ? 30 : char === "." || char === "!" || char === "?" ? 150 : 50;
          timeoutId = setTimeout(typeNextChar, speed);
        } else {
          setIsComplete(true);
        }
      };
      typeNextChar();
    };

    timeoutId = setTimeout(startTyping, delay);
    return () => clearTimeout(timeoutId);
  }, [text, delay]);

  useEffect(() => {
    if (!isComplete) return;
    const cursorInterval = setInterval(() => setShowCursor((prev) => !prev), 530);
    const hideCursor = setTimeout(() => {
      setShowCursor(false);
      clearInterval(cursorInterval);
    }, 3000);
    return () => {
      clearInterval(cursorInterval);
      clearTimeout(hideCursor);
    };
  }, [isComplete]);

  return (
    <span className={`relative inline-block align-baseline overflow-hidden ${className}`}>
      {/* Invisible full text reserves the correct height from the start, preventing layout shift */}
      <span className="invisible select-none" aria-hidden="true">{text}</span>
      {/* Visible animated text overlaid on top */}
      <span className="absolute inset-0">
        {displayedText}
        <motion.span
          animate={{ opacity: showCursor ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          className="inline-block w-[3px] h-[0.9em] ml-0.5 bg-primary align-baseline rounded-sm"
        />
      </span>
    </span>
  );
};

export default TypewriterText;
