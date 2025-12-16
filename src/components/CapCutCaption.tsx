import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { useMemo } from "react";

interface Word {
  text: string;
  start: number;
  end: number;
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
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate current active word
  const activeIndex = words.findIndex(
    (word) => frame >= word.start * fps && frame <= word.end * fps
  );

  // Spring animation for active word
  const springAnimation = spring({
    frame: frame - (words[activeIndex]?.start || 0) * fps,
    fps,
    config: {
      damping: 10,
      mass: 0.5,
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
        {words.map((word, index) => {
          const isActive = index === activeIndex;
          const isPast = frame > word.end * fps;
          const isFuture = frame < word.start * fps;

          // Scale effect for active word
          const scale = isActive
            ? interpolate(springAnimation, [0, 1], [1, 1.15])
            : 1;

          // Opacity effects
          const opacity = isActive
            ? 1
            : isPast
            ? 0.8
            : isFuture
            ? 0.3
            : 0.5;

          // Color gradient for active word
          const color = isActive
            ? highlightColor
            : isPast
            ? inactiveColor
            : "rgba(255, 255, 255, 0.3)";

          return (
            <div
              key={index}
              style={{
                position: "relative",
                display: "inline-block",
                transform: `scale(${scale})`,
                transition: "transform 0.2s ease, color 0.3s ease",
              }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize,
                  fontWeight: 600,
                  color,
                  opacity,
                  textShadow: isActive
                    ? `0 0 20px ${highlightColor}40, 0 0 40px ${highlightColor}20`
                    : "none",
                  letterSpacing: "0.02em",
                  lineHeight: 1.2,
                  display: "inline-block",
                  padding: "4px 0",
                }}
              >
                {word.text}
              </span>
              
              {/* Underline animation */}
              {withUnderline && isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -4,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, ${highlightColor}, transparent)`,
                    borderRadius: 2,
                    transform: `scaleX(${springAnimation})`,
                    transformOrigin: "left center",
                  }}
                />
              )}
              
              {/* Glow effect for active word */}
              {isActive && (
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
                    opacity: springAnimation,
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

// Export default as well for flexibility
export default CapCutCaption;