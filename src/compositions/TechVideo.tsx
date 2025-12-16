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
import { CapCutCaption } from "../components/CapCutCaption";
export const TechVideo = ({ device = { timelineFile: 'samsung-galaxy-s25-ultra.json' } }: { device: any }) => {
  const data = require(`../data/timelines/${device.timelineFile}`);
  const TRANSITION_DURATION = 30;
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const groupSize = 6;
  const wordGroups: { words: typeof data.timeline; startTime: number; endTime: number }[] = [];

  let currentIndex = 0;
  while (currentIndex < data.timeline.length) {
    const groupWords = data.timeline.slice(currentIndex, currentIndex + groupSize);
    if (groupWords.length === 0) break;

    const startTime = groupWords[0].start;
    const endTime = groupWords[groupWords.length - 1].end;

    if (!isFinite(startTime) || !isFinite(endTime) || endTime <= startTime) {
      console.warn("Skipping invalid timeline group data.");
      currentIndex += groupSize;
      continue;
    }

    wordGroups.push({
      words: groupWords,
      startTime,
      endTime,
    });

    currentIndex += groupSize;
  }

  const mainContentEndFrame =
    wordGroups.length > 0
      ? Math.ceil(wordGroups[wordGroups.length - 1].endTime * fps)
      : 1;

  const finalScreenStartFrame = mainContentEndFrame - TRANSITION_DURATION;
  const safeFinalScreenStartFrame = Math.max(0, finalScreenStartFrame);

  const currentTime = frame / fps;
  let activeGroupIndex = 0;
  let groupProgress = 0;

  for (let i = 0; i < wordGroups.length; i++) {
    if (currentTime >= wordGroups[i].startTime && currentTime <= wordGroups[i].endTime) {
      activeGroupIndex = i;
      const duration = wordGroups[i].endTime - wordGroups[i].startTime;
      groupProgress = duration > 0 ? (currentTime - wordGroups[i].startTime) / duration : 1;
      break;
    }
  }

  const groupFade = interpolate(groupProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideAnimation = interpolate(groupProgress, [0, 0.1, 0.9, 1], [50, 0, 0, -50], {
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
    }
  );

  const finalScreenTime = frame - safeFinalScreenStartFrame;

  const finalScreenOpacity = interpolate(finalScreenTime, [0, TRANSITION_DURATION], [0, 1], {
    extrapolateRight: "clamp",
  });

  const layer1Y = interpolate(finalScreenTime, [0, 30], [100, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const layer2Y = interpolate(finalScreenTime, [15, 45], [100, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const layer3Y = interpolate(finalScreenTime, [30, 60], [100, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const layer4Y = interpolate(finalScreenTime, [45, 75], [100, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: "clamp",
  });

  const button1Spring = spring({
    frame: finalScreenTime - 60,
    fps,
    config: { damping: 10, mass: 0.5 },
  });

  const imageScale = spring({
    frame: finalScreenTime - 15,
    fps,
    config: { damping: 15, mass: 0.7 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0b0f",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          
          @keyframes slide {
            0% { transform: translateX(-100%) rotate(15deg); }
            100% { transform: translateX(100%) rotate(15deg); }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle at 70% 50%, rgba(108, 99, 255, 0.1) 0%, transparent 70%)",
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />

      <Sequence from={0} durationInFrames={mainContentEndFrame}>
        {data.audio && <Audio src={staticFile(data.audio)} />}

        <div
          style={{
            opacity: mainContentOpacity,
            display: "flex",
            flexDirection: "row",
            height: "100%",
            padding: width > 768 ? "60px 80px" : "40px 20px",
            alignItems: "center",
            justifyContent: "space-between",
            gap: width > 768 ? 80 : 40,
            position: "relative",
            width: "100%",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: width > 768 ? "45%" : "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: "90%",
                maxWidth: 600,
                height: "85%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animationDelay: "0.5s",
              }}
            >
              <Img
                src={data.images.img1}
                style={{
                  // width: "100%",
                  height: "60%",
                  objectFit: "cover",
                  borderRadius: 32,
                  boxShadow: `
                    0 40px 100px rgba(108, 99, 255, 0.3),
                    0 20px 60px rgba(0,0,0,0.8),
                    inset 0 1px 0 rgba(255,255,255,0.1)
                  `,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 40,
                padding: "12px 24px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3
                style={{
                  fontSize: width > 768 ? 24 : 20,
                  fontWeight: 600,
                  color: "#ffffff",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {data.model}
              </h3>
            </div>
          </div>

          {width > 768 && (
            <div
              style={{
                width: "55%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {wordGroups.length > 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    right: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: 0.8,
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500 }}>
                    {activeGroupIndex + 1} of {wordGroups.length}
                  </span>
                  <div
                    style={{
                      width: 80,
                      height: 3,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 1.5,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${interpolate(frame, [0, mainContentEndFrame], [0, 100], {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        })}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #6C63FF, #FF6B9D)",
                        transition: "width 0.1s linear",
                      }}
                    />
                  </div>
                </div>
              )}

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {wordGroups.map((group, groupIndex) => {
                  const isActive = groupIndex === activeGroupIndex;

                  return (
                    <div
                      key={groupIndex}
                      style={{
                        position: "absolute",
                        width: "100%",
                        opacity: isActive ? groupFade : 0,
                        transform: isActive ? `translateX(${slideAnimation}px)` : "translateX(100px)",
                        transition: "opacity 0.5s ease, transform 0.5s ease",
                        pointerEvents: "none",
                      }}
                    >
                      <div style={{ marginBottom: 30, opacity: 0.8 }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            backgroundColor: "rgba(108, 99, 255, 0.15)",
                            padding: "8px 16px",
                            borderRadius: 20,
                            border: "1px solid rgba(108, 99, 255, 0.3)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#6C63FF",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {groupIndex === 0 && "INTRODUCTION"}
                            {groupIndex === 1 && "PERFORMANCE"}
                            {groupIndex === 2 && "CAMERA"}
                            {groupIndex === 3 && "FEATURES"}
                            {groupIndex > 3 && "INNOVATION"}
                          </span>
                        </div>
                      </div>

                      <h2
                        style={{
                          fontSize: 48,
                          fontWeight: 700,
                          color: "#ffffff",
                          marginBottom: 30,
                          lineHeight: 1.1,
                          background: "linear-gradient(135deg, #ffffff 0%, #a5a5a5 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {groupIndex === 0 && "Revolutionary Design"}
                        {groupIndex === 1 && "Advanced Performance"}
                        {groupIndex === 2 && "Professional Camera"}
                        {groupIndex === 3 && "Smart Features"}
                        {groupIndex > 3 && "Future Innovation"}
                      </h2>

                      <div style={{ marginBottom: 40 }}>
                        // In the CapCutCaption usage:
                        <CapCutCaption
                          words={group.words}
                          fontSize={36}
                          highlightColor="#6C63FF"
                          inactiveColor="rgba(255,255,255,0.3)"
                          withBackground={false}
                          withUnderline={true}
                          fontFamily="'Inter', system-ui, sans-serif"
                          typewriterEffect={true}  // Enable typewriter effect
                          maxWordsInQueue={5}
                          style={{
                            justifyContent: "flex-start",
                            alignItems: "flex-start",
                            bottom: "auto",
                            position: "relative",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {wordGroups.length > 1 && width > 768 && (
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 12,
              zIndex: 10,
            }}
          >
            {wordGroups.map((_, index) => (
              <div
                key={index}
                style={{
                  width: index === activeGroupIndex ? 32 : 12,
                  height: 12,
                  borderRadius: 6,
                  background: index === activeGroupIndex
                    ? "linear-gradient(90deg, #6C63FF, #FF6B9D)"
                    : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                  opacity: index <= activeGroupIndex ? 1 : 0.4,
                }}
              />
            ))}
          </div>
        )}
      </Sequence>

      <Sequence from={safeFinalScreenStartFrame} durationInFrames={Infinity}>
        <Audio
          src={staticFile("device.mp3")}
          startFrom={0}
          volume={1}
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
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 20% 30%, rgba(108, 99, 255, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(255, 107, 157, 0.1) 0%, transparent 40%),
                radial-gradient(circle at 40% 80%, rgba(0, 16, 233, 0.1) 0%, transparent 40%)
              `,
              filter: "blur(80px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
              opacity: 0.3,
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 200,
              background: "linear-gradient(to top, rgba(0, 16, 233, 0.1), transparent)",
              opacity: 0.5,
            }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: 1400,
              padding: "40px",
              display: "flex",
              flexDirection: width > 1024 ? "row" : "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: width > 1024 ? 80 : 60,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 800,
                  height: width > 768 ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    filter: "blur(40px)",
                    animation: "pulse 4s ease-in-out infinite",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  <Img
                    src={data.images.img1}
                    style={{
                      // width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 40,
                      boxShadow: `
                        0 60px 120px rgba(0, 16, 233, 0.4),
                        0 30px 80px rgba(0, 0, 0, 0.8),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                      `,
                      border: "2px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%)",
                      borderRadius: 40,
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 40,
                  padding: "16px 32px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 24,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(20px)",
                  textAlign: "center",
                  transform: `translateY(${layer2Y}px)`,
                  transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <p
                  style={{
                    fontSize: width > 768 ? 18 : 16,
                    color: "rgba(255, 255, 255, 0.7)",
                    fontWeight: 500,
                    margin: 0,
                    letterSpacing: "0.05em",
                  }}
                >
                  Music Playing: ezoix.com Nation anthem
                </p>
              </div>
            </div>

            <div
              style={{
                width: width > 1024 ? "45%" : "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 40,
              }}
            >
              <div
                style={{
                  transform: `translateY(${layer1Y}px)`,
                  transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    backgroundColor: "rgba(0, 16, 233, 0.15)",
                    padding: "12px 24px",
                    borderRadius: 24,
                    border: "1px solid rgba(0, 16, 233, 0.3)",
                    marginBottom: 20,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0010e9",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Detailed specs
                  </span>
                </div>

                <h1
                  style={{
                    fontSize: width > 768 ? 56 : 48,
                    fontWeight: 800,
                    color: "#ffffff",
                    margin: "0 0 16px 0",
                    lineHeight: 1.1,
                    background: "linear-gradient(135deg, #ffffff 0%, #0010e9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {data.model}
                </h1>

                <p
                  style={{
                    fontSize: width > 768 ? 20 : 18,
                    color: "rgba(255, 255, 255, 0.7)",
                    lineHeight: 1.6,
                    maxWidth: 500,
                  }}
                >
                  Discover cutting-edge technology, trusted reviews, and smart insights—only on ezoix.com.
                </p>
              </div>

              <div
                style={{
                  transform: `translateY(${layer3Y}px)`,
                  transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: width > 768 ? "repeat(2, 1fr)" : "1fr",
                    gap: 16,
                    marginBottom: 40,
                  }}
                >
                  {data.features?.slice(0, 4).map((feature: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "16px 20px",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        borderRadius: 16,
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #0010e9, #6C63FF)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13 4L6.5 10.5L4 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span
                        style={{
                          fontSize: 16,
                          color: "#ffffff",
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {`${feature.label}: ${feature.value}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  transform: `translateY(${layer4Y}px)`,
                  transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
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
                        padding: width > 768 ? "28px 56px" : "24px 48px",
                        background: "linear-gradient(135deg, #ffffff 0%, #0010e9 100%)",
                        borderRadius: 20,
                        fontWeight: 800,
                        color: "#0b0b0f",
                        fontSize: width > 768 ? 24 : 20,
                        cursor: "pointer",
                        boxShadow: `
                          0 20px 60px rgba(0, 16, 233, 0.5),
                          0 8px 30px rgba(255, 255, 255, 0.1)
                        `,
                        transform: `scale(${0.9 + button1Spring * 0.1})`,
                        transition: "all 0.3s ease",
                        textAlign: "center",
                        minWidth: width > 768 ? 300 : 250,
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
                          background: "linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.2) 50%, transparent 60%)",
                          opacity: 0.5,
                        }}
                      />

                      <span style={{ position: "relative", zIndex: 1 }}>
                        Learn More at ezoix.com
                      </span>

                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{
                          marginLeft: 12,
                          display: "inline-block",
                          verticalAlign: "middle",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#0b0b0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </a>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 20px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0010e9, #6C63FF)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3V12L16 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      where everything is a tech
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: i * 20,
                height: i * 20,
                borderRadius: "50%",
                background: `radial-gradient(circle, rgba(${0 + i * 20}, ${16 + i * 10}, ${233 + i * 5}, ${0.03 + i * 0.01}) 0%, transparent 70%)`,
                top: `${15 + i * 15}%`,
                left: `${10 + i * 5}%`,
                filter: "blur(15px)",
                animation: `float ${10 + i * 2}s ease-in-out infinite`,
                animationDelay: `${i}s`,
                zIndex: 1,
              }}
            />
          ))}

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: "200%",
                  height: `${2 + i}px`,
                  background: `linear-gradient(90deg, transparent, rgba(0, 16, 233, ${0.2 + i * 0.1}), transparent)`,
                  top: `${20 + i * 20}%`,
                  left: "-50%",
                  transform: `rotate(${15 + i * 10}deg)`,
                  animation: `slide ${15 + i * 5}s linear infinite`,
                  animationDelay: `${i * 2}s`,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};