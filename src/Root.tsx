import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";

import { TechVideo } from "./compositions/TechVideo";
import { WordSequence } from "./components/WordSequence";
import { Layout } from "./components/Layout";

// Sample data for WordSequence demo
const sampleTimeline = [
  { text: "Innovation", start: 0, end: 2 },
  { text: "Meets", start: 2, end: 4 },
  { text: "Design", start: 4, end: 6 },
];

// 🔑 Constants
const FPS = 30;
const OUTRO_SECONDS = 10;

export const Root: React.FC = () => {
  return (
    <>
      {/* ===============================
         MAIN TECH VIDEO (AUTO DURATION)
      =============================== */}
      <Composition
        id="TechVideo"
        component={TechVideo}
        fps={FPS}
        width={1920}
        height={1080}
        calculateMetadata={async ({ props }) => {
          // 🔒 SAFETY: handle missing props
          const device = props?.device;

          if (!device?.audio) {
            // Fallback duration (10s outro only)
            return {
              durationInFrames: OUTRO_SECONDS * FPS,
            };
          }

          // Convert "/audio/file.mp3" → "audio/file.mp3"
          const audioPath = device.audio.replace(/^\/+/, "");

          const audioDuration =
            await getAudioDurationInSeconds(staticFile(audioPath));

          return {
            durationInFrames: Math.ceil(
              (audioDuration + OUTRO_SECONDS) * FPS
            ),
          };
        }}
      />

      {/* ===============================
         WORD SEQUENCE DEMO
      =============================== */}
      <Composition
        id="WordSequence-basic"
        component={() => (
          <Layout>
            <WordSequence timeline={sampleTimeline} />
          </Layout>
        )}
        durationInFrames={FPS * 10}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ===============================
         PORTRAIT VERSION (AUTO DURATION)
      =============================== */}
      <Composition
        id="PortraitTechVideo"
        component={TechVideo}
        fps={FPS}
        width={1080}
        height={1920}
        calculateMetadata={async ({ props }) => {
          const device = props?.device;

          if (!device?.audio) {
            return {
              durationInFrames: OUTRO_SECONDS * FPS,
            };
          }

          const audioPath = device.audio.replace(/^\/+/, "");
          const audioDuration =
            await getAudioDurationInSeconds(staticFile(audioPath));

          return {
            durationInFrames: Math.ceil(
              (audioDuration + OUTRO_SECONDS) * FPS
            ),
          };
        }}
      />
    </>
  );
};
