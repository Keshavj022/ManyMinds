"use client";

import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  text: string;
  /** ms per character */
  speed?: number;
  /** ms delay before typing starts */
  startDelay?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * Minimal character-by-character typewriter, no dependencies.
 * Preserves "\n\n" paragraph breaks.
 */
export default function Typewriter({
  text,
  speed = 18,
  startDelay = 0,
  onComplete,
  className = "",
}: TypewriterProps) {
  const [shown, setShown] = useState(0);
  // Keep latest onComplete in a ref so we don't restart on every render
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setShown(0);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = (i: number) => {
      if (cancelled) return;
      if (i > text.length) {
        onCompleteRef.current?.();
        return;
      }
      setShown(i);
      timer = setTimeout(() => tick(i + 1), speed);
    };

    const starter = setTimeout(() => tick(0), startDelay);

    return () => {
      cancelled = true;
      clearTimeout(starter);
      if (timer) clearTimeout(timer);
    };
  }, [text, speed, startDelay]);

  const partial = text.slice(0, shown);
  const paragraphs = partial.split("\n\n");

  return (
    <div className={className}>
      {paragraphs.map((p, idx) => (
        <p
          key={idx}
          className={`text-base md:text-lg text-white/80 leading-relaxed ${
            idx > 0 ? "mt-4" : ""
          }`}
        >
          {p}
          {idx === paragraphs.length - 1 && shown < text.length && (
            <span
              aria-hidden
              className="inline-block w-[2px] h-[1em] align-[-0.15em] ml-[2px] bg-white/70 animate-pulse-soft"
            />
          )}
        </p>
      ))}
    </div>
  );
}
