import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  Sequence,
} from "remotion";
export const TechVideo = ({ device: data }: { device: any }) => {
  const OUTRO_AUDIO = "device.mp3";

  // 1. Process and normalize the data passed in the props
  // Ensure words have a 'duration' property for safer calculation
  const processedWords = (data.timeline || []).map((word: any) => ({
    ...word,
    duration: word.end - word.start,
  }));

  const finalData = {
    ...data,
    timeline: processedWords,
    phrases: data.phrases || [],
    // Use data.images/features/model directly, with sane fallbacks
    images: data.images || { img1: 'default-image.jpg' },
    features: data.features || data.specs || [],
    model: data.model || 'Unknown Device',
    audio: data.audio || null,
  };

  // 2. Check for critical missing data
  if (!finalData || !finalData.timeline || finalData.timeline.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#0b0b0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 48, color: "white" }}>ERROR: Timeline data is missing. Check props file merge.</div>
      </AbsoluteFill>
    );
  }


  const TRANSITION_DURATION = 30;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();


  // --- Word Grouping Logic (Uses finalData) ---
  const groupSize = 5;
  const wordGroups: {
    words: any[];
    startTime: number;
    endTime: number;
    duration: number;
    id: string;
  }[] = [];

  const sourcePhrases = finalData.phrases && finalData.phrases.length > 0 ? finalData.phrases : null;

  if (sourcePhrases) {
    sourcePhrases.forEach((phrase: any, index: number) => {
      if (phrase.words && phrase.words.length > 0) {
        wordGroups.push({
          words: phrase.words.map((word: any) => ({ ...word, duration: word.end - word.start })),
          startTime: phrase.start,
          endTime: phrase.end,
          duration: phrase.end - phrase.start,
          id: `phrase-${index}`,
        });
      }
    });
  } else {
    let currentIndex = 0;
    while (currentIndex < finalData.timeline.length) {
      const groupWords = finalData.timeline.slice(currentIndex, currentIndex + groupSize);
      if (groupWords.length === 0) break;

      const startTime = groupWords[0].start;
      const endTime = groupWords[groupWords.length - 1].end;
      const duration = endTime - startTime;

      wordGroups.push({
        words: groupWords,
        startTime,
        endTime,
        duration,
        id: `group-${currentIndex}`,
      });

      currentIndex += groupSize;
    }
  }
  // --- End of Word Grouping Logic ---


  const lastGroupEndTime = wordGroups.length > 0 ? wordGroups[wordGroups.length - 1].endTime : 0;
  const mainContentEndFrame = Math.ceil(lastGroupEndTime * fps) + 30;

  const finalScreenStartFrame = mainContentEndFrame - TRANSITION_DURATION;
  const safeFinalScreenStartFrame = Math.max(0, finalScreenStartFrame);

  const currentTime = frame / fps;

  let activeGroupIndex = -1;
  let groupProgress = 0;

  for (let i = 0; i < wordGroups.length; i++) {
    const group = wordGroups[i];
    if (currentTime >= group.startTime && currentTime <= group.endTime) {
      activeGroupIndex = i;
      groupProgress = group.duration > 0
        ? (currentTime - group.startTime) / group.duration
        : 1;
      break;
    }
  }

  // Added buffer logic for smooth entry/exit transition points
  if (activeGroupIndex === -1 && wordGroups.length > 0) {
    const firstGroup = wordGroups[0];
    const lastGroup = wordGroups[wordGroups.length - 1];

    if (currentTime < firstGroup.startTime && currentTime >= firstGroup.startTime - 0.5) {
      activeGroupIndex = 0;
      groupProgress = interpolate(currentTime, [firstGroup.startTime - 0.5, firstGroup.startTime], [0, 0.01]);
    } else if (currentTime > lastGroup.endTime && currentTime <= lastGroup.endTime + 0.5) {
      activeGroupIndex = wordGroups.length - 1;
      groupProgress = 1;
    }
  }

  // Enhanced animations
  const groupFade = interpolate(groupProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const slideAnimation = interpolate(groupProgress, [0, 0.2, 0.8, 1], [80, 0, 0, -80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  const scaleAnimation = interpolate(groupProgress, [0, 0.1, 0.9, 1], [0.95, 1, 1, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mainContentOpacity = interpolate(
    frame,
    [safeFinalScreenStartFrame, mainContentEndFrame],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  const finalScreenTime = Math.max(0, frame - safeFinalScreenStartFrame);

  const finalScreenOpacity = interpolate(
    finalScreenTime,
    [0, TRANSITION_DURATION * 0.5],
    [0, 1],
    {
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  // Enhanced layer animations for final screen
  const layer1Y = interpolate(finalScreenTime, [0, 40], [100, 0], {
    easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
    extrapolateRight: "clamp",
  });

  const layer3Y = interpolate(finalScreenTime, [30, 70], [100, 0], {
    easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
    extrapolateRight: "clamp",
  });

  const layer4Y = interpolate(finalScreenTime, [45, 85], [100, 0], {
    easing: Easing.out(Easing.bezier(0.34, 1.56, 0.64, 1)),
    extrapolateRight: "clamp",
  });

  const button1Spring = spring({
    frame: finalScreenTime - 60,
    fps,
    config: { damping: 8, mass: 0.7, stiffness: 100 },
  });

  const pulseValue = Math.sin(frame * 0.1) * 0.05 + 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0b0f",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Enhanced animations (CSS Keyframes) */}
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(5deg); }
          }
          
          @keyframes pulseGlow {
            0%, 100% { 
              opacity: 0.3;
              filter: drop-shadow(0 0 10px rgba(108, 99, 255, 0.3));
            }
            50% { 
              opacity: 0.6;
              filter: drop-shadow(0 0 30px rgba(108, 99, 255, 0.6));
            }
          }
          
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      {/* Background effects */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 30% 20%, rgba(108, 99, 255, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 107, 157, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 20% 80%, rgba(0, 16, 233, 0.08) 0%, transparent 50%)
          `,
          animation: "gradientFlow 20s ease infinite",
          backgroundSize: "200% 200%",
          opacity: 0.6,
        }}
      />

      <Sequence from={0} durationInFrames={mainContentEndFrame}>
        {finalData.audio && (
          // Audio synchronization fix: starts at frame 0 of the sequence
          <Audio
            src={staticFile(finalData.audio.replace(/^\//, ''))}
            volume={0.9}
            startFrom={0}
          />
        )}

        <div
          style={{
            opacity: mainContentOpacity,
            display: "flex",
            flexDirection: width > 1024 ? "row" : "column",
            height: "100%",
            padding: width > 1024 ? "80px 100px" : "60px 40px",
            alignItems: "center",
            justifyContent: width > 1024 ? "space-between" : "flex-start",
            gap: width > 1024 ? 100 : 60,
            position: "relative",
            width: "100%",
            zIndex: 2,
          }}
        >
          {/* Device Image Section */}
          <div
            style={{
              width: width > 1024 ? "45%" : "100%",
              height: width > 1024 ? "100%" : "50%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 600,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Glow effect */}
              <div
                style={{
                  position: "absolute",
                  width: "120%",
                  height: "120%",
                  background: "radial-gradient(circle, rgba(108, 99, 255, 0.2) 0%, transparent 70%)",
                  filter: "blur(40px)",
                  animation: "pulseGlow 4s ease-in-out infinite",
                }}
              />

              <Img
                src={finalData.images.img1}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "85%",
                  objectFit: "contain",
                  borderRadius: 40,
                  transform: `scale(${pulseValue})`,
                  transition: "transform 0.5s ease",
                  boxShadow: `
                    0 50px 100px rgba(108, 99, 255, 0.4),
                    0 25px 80px rgba(0, 0, 0, 0.8),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15)
                  `,
                  border: "2px solid rgba(255, 255, 255, 0.15)",
                  position: "relative",
                  zIndex: 1,
                }}
              />

              {/* Reflective overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.08) 50%, transparent 60%)",
                  borderRadius: 40,
                  pointerEvents: "none",
                  zIndex: 2,
                  animation: "shimmer 3s infinite linear",
                }}
              />
            </div>

            {/* Device name with enhanced styling */}
            <div
              style={{
                marginTop: 40,
                padding: "16px 32px",
                backgroundColor: "rgba(255, 255, 255, 0.07)",
                borderRadius: 24,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            >
              <h3
                style={{
                  fontSize: width > 768 ? 28 : 22,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #ffffff 0%, #a5a5a5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  margin: 0,
                  textAlign: "center",
                  letterSpacing: "0.02em",
                }}
              >
                {finalData.model}
              </h3>
            </div>
          </div>

          {/* Text Content Section */}
          <div
            style={{
              width: width > 1024 ? "55%" : "100%",
              height: width > 1024 ? "100%" : "50%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
              padding: width > 1024 ? "0 0 0 40px" : "20px 0",
            }}
          >
            {/* Progress indicator (Unchanged) */}
            {wordGroups.length > 1 && width > 768 && (
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: 0.9,
                  zIndex: 10,
                }}
              >
                <span style={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}>
                  {Math.min(activeGroupIndex + 1, wordGroups.length)} / {wordGroups.length}
                </span>
                <div
                  style={{
                    width: 120,
                    height: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(
                        currentTime,
                        [0, lastGroupEndTime || 1],
                        [0, 100]
                      )}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #6C63FF, #FF6B9D, #0010e9)",
                      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
                        animation: "shimmer 2s infinite linear",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Word Groups Display Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: width > 1024 ? "100%" : "400px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {wordGroups.map((group, groupIndex) => {
                const isActive = groupIndex === activeGroupIndex;
                const isPast = groupIndex < activeGroupIndex;
                // const isFuture = groupIndex > activeGroupIndex; // Not used directly in logic below

                // Set the default transform for past and future groups to move them off-screen
                const offScreenTransform = isPast
                  ? `translateY(-150%) translateX(-100px) scale(0.95)`
                  : `translateY(50%) translateX(100px) scale(0.95)`;

                return (
                  <div
                    key={group.id}
                    style={{
                      position: "absolute",
                      width: "100%",
                      // FIX 1: Opacity is now driven entirely by isActive/groupFade
                      opacity: isActive ? groupFade : 0,

                      transform: isActive
                        ? `translateY(-50%) translateX(${slideAnimation}px) scale(${scaleAnimation})`
                        : `translateY(-50%) ${offScreenTransform}`,

                      transition: "opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                      pointerEvents: "none",
                      top: '50%',
                    }}
                  >
                    {/* Section Label (Unchanged) */}
                    <div style={{ marginBottom: 30 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: isActive
                            ? "linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(255, 107, 157, 0.15))"
                            : "rgba(108, 99, 255, 0.1)",
                          padding: "10px 20px",
                          borderRadius: 20,
                          border: `1px solid ${isActive ? "rgba(108, 99, 255, 0.4)" : "rgba(108, 99, 255, 0.2)"}`,
                          backdropFilter: "blur(10px)",
                          transform: isActive ? "scale(1.05)" : "scale(1)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: isActive ? "#6C63FF" : "rgba(108, 99, 255, 0.7)",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {groupIndex === 0 && "INTRODUCTION"}
                          {groupIndex === 1 && "DESIGN & DISPLAY"}
                          {groupIndex === 2 && "PERFORMANCE"}
                          {groupIndex === 3 && "CAMERA"}
                          {groupIndex === 4 && "BATTERY"}
                          {groupIndex > 4 && "FEATURES"}
                        </span>
                      </div>
                    </div>

                    {/* Group Title (Unchanged) */}
                    <h2
                      style={{
                        fontSize: width > 768 ? 52 : 40,
                        fontWeight: 800,
                        background: "linear-gradient(135deg, #ffffff 0%, #6C63FF 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        marginBottom: 30,
                        lineHeight: 1.1,
                        opacity: isActive ? 1 : 0.7,
                      }}
                    >
                      {groupIndex === 0 && "Next Generation"}
                      {groupIndex === 1 && "Premium Design"}
                      {groupIndex === 2 && "Powerful Performance"}
                      {groupIndex === 3 && "Advanced Camera"}
                      {groupIndex === 4 && "All-Day Battery"}
                      {groupIndex > 4 && "Smart Features"}
                    </h2>

                    {/* FIX 2: Full Chunk Text with Dynamic Highlighting */}
                    <div style={{ marginBottom: 40 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        {group.words.map((word: any, wordIndex: number) => {
                          const wordStartFrame = word.start * fps;
                          const wordEndFrame = word.end * fps;
                          // Check if the word is currently being spoken
                          const isWordActive = frame >= wordStartFrame && frame <= wordEndFrame;

                          const wordDurationFrames = (word.duration * fps) || (wordEndFrame - wordStartFrame);

                          const wordProgress = isWordActive
                            ? (frame - wordStartFrame) / wordDurationFrames
                            : 0;

                          // Handle special cases (like "6.3 inch" should stay together)
                          const displayText = word.text === "6." && group.words[wordIndex + 1]?.text === "3"
                            ? "6.3"
                            : word.text;

                          // Skip the next word if we combined it
                          if (word.text === "3" && group.words[wordIndex - 1]?.text === "6.") {
                            return null;
                          }

                          return (
                            <div
                              key={`${wordIndex}-${word.text}`}
                              style={{
                                display: "inline-block",
                                position: "relative",
                                // Only apply the vertical bounce/scale if the word is active
                                transform: isWordActive
                                  ? `translateY(${interpolate(
                                    wordProgress,
                                    [0, 0.2, 0.8, 1],
                                    [0, -5, -5, 0]
                                  )}px) scale(${interpolate(
                                    wordProgress,
                                    [0, 0.2, 0.8, 1],
                                    [1, 1.1, 1.1, 1]
                                  )})`
                                  : "none",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "'SF Pro Display', -apple-system, system-ui, sans-serif",
                                  fontSize: width > 768 ? 40 : 32,
                                  fontWeight: isWordActive ? 700 : 500,
                                  // Color logic: White for active, faded white for past, darker faded white for future
                                  color: isWordActive
                                    ? "#ffffff"
                                    : frame > wordEndFrame
                                      ? "rgba(255, 255, 255, 0.6)"
                                      : "rgba(255, 255, 255, 0.4)",

                                  // Gradient/Text-fill only for active word
                                  background: isWordActive
                                    ? "linear-gradient(135deg, #6C63FF, #FF6B9D)"
                                    : "transparent",
                                  WebkitBackgroundClip: isWordActive ? "text" : "unset",
                                  WebkitTextFillColor: isWordActive ? "transparent" : "unset",
                                  backgroundClip: isWordActive ? "text" : "unset",

                                  // Glow only for active word
                                  textShadow: isWordActive
                                    ? `0 0 20px rgba(108, 99, 255, 0.5), 0 0 40px rgba(108, 99, 255, 0.3)`
                                    : "none",

                                  letterSpacing: "0.02em",
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  position: "relative",
                                  display: "inline-block",
                                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                              >
                                {displayText}

                                {/* Active word underline effect (only visible if active) */}
                                {isWordActive && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: 2,
                                      left: "10%",
                                      right: "10%",
                                      height: 3,
                                      background: "linear-gradient(90deg, #6C63FF, #FF6B9D)",
                                      borderRadius: 2,
                                      transform: `scaleX(${wordProgress})`,
                                      transformOrigin: "left center",
                                      transition: "transform 0.1s linear",
                                    }}
                                  />
                                )}

                                {/* Glow effect for active word (only visible if active) */}
                                {isWordActive && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "50%",
                                      left: "50%",
                                      width: "200%",
                                      height: "200%",
                                      background: "radial-gradient(circle, rgba(108, 99, 255, 0.2) 0%, transparent 70%)",
                                      transform: "translate(-50%, -50%)",
                                      zIndex: -1,
                                      opacity: wordProgress,
                                    }}
                                  />
                                )}
                              </span>

                              {/* Add punctuation with proper spacing */}
                              {word.punctuation && (
                                <span style={{
                                  color: frame > wordEndFrame
                                    ? "rgba(255, 255, 255, 0.6)"
                                    : "rgba(255, 255, 255, 0.4)",
                                  fontSize: width > 768 ? 40 : 32,
                                  marginLeft: -4,
                                }}>
                                  {word.punctuation}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced progress dots (Unchanged) */}
        {wordGroups.length > 1 && width > 768 && (
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 16,
              zIndex: 10,
            }}
          >
            {wordGroups.map((_, index) => {
              const isActive = index === activeGroupIndex;
              const isPast = index < activeGroupIndex;

              return (
                <div
                  key={index}
                  style={{
                    width: isActive ? 40 : 12,
                    height: 12,
                    borderRadius: 6,
                    background: isActive
                      ? "linear-gradient(90deg, #6C63FF, #FF6B9D)"
                      : isPast
                        ? "rgba(108, 99, 255, 0.5)"
                        : "rgba(255, 255, 255, 0.2)",
                    transform: isActive ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    opacity: isPast ? 0.7 : isActive ? 1 : 0.4,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                        animation: "shimmer 1.5s infinite linear",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Sequence>

      {/* Final Screen (Outro) (Unchanged) */}
      <Sequence from={safeFinalScreenStartFrame} durationInFrames={Infinity}>
        <Audio
          src={staticFile("device.mp3")}
          startFrom={0}
          volume={0.9}
        />

        <AbsoluteFill
          style={{
            backgroundColor: "#0b0b0f",
            opacity: finalScreenOpacity,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Background effects for final screen */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 30%, rgba(108, 99, 255, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(255, 107, 157, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(0, 16, 233, 0.15) 0%, transparent 50%)
              `,
              filter: "blur(100px)",
              animation: "gradientFlow 15s ease infinite",
              backgroundSize: "200% 200%",
            }}
          />

          {/* Content */}
          <div
            style={{
              width: "100%",
              maxWidth: 1400,
              padding: "60px 40px",
              display: "flex",
              flexDirection: width > 1200 ? "row" : "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: width > 1200 ? 100 : 80,
              position: "relative",
              zIndex: 2,
            }}
          >


            {/* Specs Section */}
            <div
              style={{
                width: width > 1200 ? "100%" : "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 50,
              }}
            >
              {/* Header */}
              <div
                style={{
                  transform: `translateY(${layer1Y}px)`,
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "linear-gradient(135deg, rgba(0, 16, 233, 0.2), rgba(108, 99, 255, 0.15))",
                    padding: "14px 28px",
                    borderRadius: 28,
                    border: "1px solid rgba(0, 16, 233, 0.4)",
                    backdropFilter: "blur(20px)",
                    marginBottom: 24,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0010e9",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    Complete Specifications
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: width > 768 ? 64 : 52,
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #ffffff 0%, #0010e9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    margin: "0 0 20px 0",
                    lineHeight: 1.1,
                  }}
                >
                  {finalData.model}
                </h1>

                <p
                  style={{
                    fontSize: width > 768 ? 22 : 18,
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: 1.7,
                    maxWidth: 600,
                    fontWeight: 400,
                  }}
                >
                  Discover cutting-edge technology, expert reviews, and smart insights—only on ezoix.com.
                </p>
              </div>

              {/* Specs Grid */}
              <div
                style={{
                  transform: `translateY(${layer3Y}px)`,
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: width > 768 ? "repeat(2, 1fr)" : "1fr",
                    gap: 20,
                    marginBottom: 50,
                  }}
                >
                  {(finalData.features || finalData.specs || []).slice(0, 6).map((feature: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "20px 24px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: 20,
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        backdropFilter: "blur(15px)",
                        transition: "all 0.3s ease",
                        transform: "translateY(0)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-5px)";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.border = "1px solid rgba(0, 16, 233, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        e.currentTarget.style.border = "1px solid rgba(255, 255, 255, 0.1)";
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #0010e9, #6C63FF)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 4px 20px rgba(0, 16, 233, 0.4)",
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)", marginBottom: 4 }}>
                          {feature.label}
                        </div>
                        <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 600 }}>
                          {feature.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div
                style={{
                  transform: `translateY(${layer4Y}px)`,
                  transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    alignItems: width > 768 ? "flex-start" : "center",
                  }}
                >
                  <a
                    href="https://ezoix.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    <div
                      style={{
                        padding: width > 768 ? "32px 64px" : "28px 56px",
                        background: "linear-gradient(135deg, #0010e9 0%, #6C63FF 100%)",
                        borderRadius: 24,
                        fontWeight: 800,
                        color: "#ffffff",
                        fontSize: width > 768 ? 26 : 22,
                        cursor: "pointer",
                        boxShadow: `
                          0 25px 80px rgba(0, 16, 233, 0.6),
                          0 12px 40px rgba(255, 255, 255, 0.15)
                        `,
                        transform: `scale(${0.95 + button1Spring * 0.1})`,
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        textAlign: "center",
                        minWidth: width > 768 ? 350 : 280,
                        position: "relative",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = `
                          0 35px 100px rgba(0, 16, 233, 0.8),
                          0 15px 50px rgba(255, 255, 255, 0.2)
                        `;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = `scale(${0.95 + button1Spring * 0.1})`;
                        e.currentTarget.style.boxShadow = `
                          0 25px 80px rgba(0, 16, 233, 0.6),
                          0 12px 40px rgba(255, 255, 255, 0.15)
                        `;
                      }}
                    >
                      {/* Shimmer effect */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: "linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%)",
                          opacity: 0.6,
                          animation: "shimmer 3s infinite linear",
                        }}
                      />

                      <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                        Learn More at ezoix.com
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{
                            transition: "transform 0.3s ease",
                          }}
                        >
                          <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </a>

                  {/* Tagline */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "16px 24px",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: 16,
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0010e9, #6C63FF)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 20px rgba(0, 16, 233, 0.5)",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3V12L16 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: 16,
                        color: "rgba(255, 255, 255, 0.7)",
                        fontWeight: 500,
                      }}
                    >
                      Where technology meets innovation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating particles */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: i * 30,
                height: i * 30,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(${0 + i * 15}, ${16 + i * 8}, ${233 + i * 4}, ${0.05 + i * 0.02}) 0%, transparent 70%)`,
                top: `${10 + i * 10}%`,
                left: `${5 + i * 10}%`,
                filter: "blur(20px)",
                animation: `float ${12 + i * 3}s ease-in-out infinite`,
                animationDelay: `${i}s`,
                zIndex: 1,
              }}
            />
          ))}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};