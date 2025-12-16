import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useMemo } from "react";

interface Word {
  text: string;
  start: number;
  end: number;
  punctuation?: string;
}

interface DisplayWord extends Word {
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
  isJustAdded?: boolean;
  queueIndex?: number;
}

interface CapCutCaptionProps {
  words: Word[];
  style?: React.CSSProperties;
  highlightColor?: string;
  inactiveColor?: string;
  fontSize?: number;
  fontFamily?: string;
  withBackground?: boolean;
  withUnderline?: boolean;
  typewriterEffect?: boolean;
  maxWordsInQueue?: number;
}

export const CapCutCaption: React.FC<CapCutCaptionProps> = ({
  words,
  style,
  highlightColor = "#ffffff",
  inactiveColor = "rgba(255, 255, 255, 0.5)",
  fontSize = 70,
  fontFamily = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  withBackground = true,
  withUnderline = true,
  typewriterEffect = false,
  maxWordsInQueue = 10,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate current active word
  const activeIndex = words.findIndex(
    (word) => frame >= word.start * fps && frame <= word.end * fps
  );

  // Get active word
  const activeWord = activeIndex >= 0 ? words[activeIndex] : null;

  // Calculate which words should be displayed based on the queue logic
  const displayWords = useMemo(() => {
    if (!typewriterEffect || !activeWord) {
      // Return original words if no typewriter effect or no active word
      return words.map((word, index) => ({
        ...word,
        isActive: index === activeIndex,
        isPast: frame > word.end * fps,
        isFuture: frame < word.start * fps,
      }));
    }

    // Find all words that have started up to the current frame
    const startedWords = words.filter(word => frame >= word.start * fps);
    
    // Sort by start time
    const sortedWords = [...startedWords].sort((a, b) => a.start - b.start);
    
    // Take only the last maxWordsInQueue words (queue behavior)
    const queueWords = sortedWords.slice(-maxWordsInQueue);
    
    // Map to include state information
    return queueWords.map((word, index) => {
      const isActive = word.text === activeWord.text;
      const isPast = frame > word.end * fps;
      const isFuture = frame < word.start * fps;
      const isJustAdded = word.text === activeWord.text && 
                         frame - word.start * fps <= fps * 0.3; // First 0.3 seconds
      
      return {
        ...word,
        isActive,
        isPast,
        isFuture,
        isJustAdded,
        queueIndex: index,
      };
    });
  }, [words, frame, fps, activeIndex, activeWord, typewriterEffect, maxWordsInQueue]);

  // Spring animation for active word
  const springAnimation = spring({
    frame: activeWord ? Math.max(0, frame - activeWord.start * fps) : 0,
    fps,
    config: {
      damping: 25,
      mass: 0.8,
      stiffness: 200,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: "15%",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          maxWidth: "90%",
          padding: withBackground ? "24px 36px" : "0",
          borderRadius: withBackground ? 20 : 0,
          background: withBackground
            ? "linear-gradient(135deg, rgba(0, 0, 0, 0.85), rgba(20, 20, 20, 0.9))"
            : "transparent",
          backdropFilter: withBackground ? "blur(20px)" : "none",
          boxShadow: withBackground
            ? "0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            : "none",
          border: withBackground
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "none",
        }}
      >
        {displayWords.map((word, index) => {
          // Scale effect for active word
          const scale = word.isActive
            ? interpolate(springAnimation, [0, 1], [1, 1.08])
            : 1;

          // Opacity effects
          let opacity: number;
          if (word.isActive) {
            opacity = 1;
          } else if (word.isPast) {
            // Fade out past words gradually
            const timeSinceEnd = frame - word.end * fps;
            opacity = interpolate(
              timeSinceEnd,
              [0, fps * 0.5],
              [1, 0.6],
              { extrapolateRight: "clamp" }
            );
          } else if (word.isFuture) {
            opacity = 0.3;
          } else {
            opacity = 0.5;
          }

          // Ensure opacity is a valid number
          opacity = Math.max(0, Math.min(1, opacity || 0));

          // Queue effect for older words
          const queueOpacity = typewriterEffect && word.queueIndex !== undefined
            ? interpolate(
                word.queueIndex,
                [0, maxWordsInQueue - 1],
                [0.6, 1]
              )
            : 1;

          const finalOpacity = opacity * queueOpacity;

          // Color
          const color = word.isActive
            ? highlightColor
            : word.isPast
            ? inactiveColor
            : "rgba(255, 255, 255, 0.3)";

          // Typewriter typing animation for newly added words
          const typingProgress = word.isJustAdded && word.isActive
            ? interpolate(
                frame - word.start * fps,
                [0, fps * 0.15],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            : 1;

          return (
            <div
              key={`${index}-${word.text}`}
              style={{
                position: "relative",
                display: "inline-block",
                transform: `scale(${scale})`,
                transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), color 0.4s ease, opacity 0.4s ease",
                willChange: "transform, opacity",
                opacity: finalOpacity,
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize,
                  fontWeight: 600,
                  color,
                  textShadow: word.isActive
                    ? `0 0 20px ${highlightColor}40, 0 0 40px ${highlightColor}20`
                    : "none",
                  letterSpacing: "0.02em",
                  lineHeight: 1.2,
                  display: "inline-block",
                  padding: "4px 0",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Typewriter effect */}
                {typewriterEffect && word.isJustAdded ? (
                  <>
                    <span style={{
                      position: "relative",
                      display: "inline-block",
                    }}>
                      {word.text}
                      {/* Cursor */}
                      {word.isActive && (
                        <span
                          style={{
                            position: "absolute",
                            right: -8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 3,
                            height: fontSize * 0.8,
                            backgroundColor: highlightColor,
                            animation: "blink 1s infinite",
                          }}
                        />
                      )}
                    </span>
                    {/* Typing overlay */}
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        transform: `translateX(${(1 - typingProgress) * 100}%)`,
                        transition: "transform 0.1s linear",
                      }}
                    />
                  </>
                ) : (
                  word.text
                )}
              </span>
              
              {/* Underline animation */}
              {withUnderline && word.isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -4,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: highlightColor,
                    borderRadius: 2,
                    transform: `scaleX(${springAnimation})`,
                    transformOrigin: "left center",
                    opacity: springAnimation,
                  }}
                />
              )}
              
              {/* Glow effect */}
              {word.isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "150%",
                    height: "150%",
                    background: `radial-gradient(circle, ${highlightColor}15 0%, transparent 70%)`,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    zIndex: -1,
                    opacity: springAnimation * 0.5,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Add blinking animation to styles
export const TypewriterStyles = () => (
  <style>
    {`
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `}
  </style>
);

export default CapCutCaption;