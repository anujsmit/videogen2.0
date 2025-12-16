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

          if (!device?.timelineFile) {
            // Fallback duration (10s outro only)
            return {
              durationInFrames: OUTRO_SECONDS * FPS,
            };
          }

          // Try to get audio duration from timeline data
          try {
            // Import timeline data
            const timelineData = require(`./data/timelines/${device.timelineFile}`);
            if (timelineData?.timeline?.length > 0) {
              const lastWord = timelineData.timeline[timelineData.timeline.length - 1];
              const audioDuration = lastWord.end + 1; // Add 1 second buffer
              
              return {
                durationInFrames: Math.ceil(
                  (audioDuration + OUTRO_SECONDS) * FPS
                ),
              };
            }
          } catch (error) {
            console.warn("Could not load timeline data:", error);
          }

          // Fallback to audio file if available
          if (device.audio) {
            try {
              // Convert "/audio/file.mp3" → "audio/file.mp3"
              const audioPath = device.audio.replace(/^\/+/, "");
              const audioDuration = await getAudioDurationInSeconds(staticFile(audioPath));
              
              return {
                durationInFrames: Math.ceil(
                  (audioDuration + OUTRO_SECONDS) * FPS
                ),
              };
            } catch (audioError) {
              console.warn("Could not get audio duration:", audioError);
            }
          }

          // Ultimate fallback
          return {
            durationInFrames: (30 + OUTRO_SECONDS) * FPS, // 30s main + 10s outro
          };
        }}
        defaultProps={{
          device: {
            timelineFile: 'samsung-galaxy-s25-ultra.json'
          }
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

          if (!device?.timelineFile) {
            return {
              durationInFrames: OUTRO_SECONDS * FPS,
            };
          }

          try {
            const timelineData = require(`./data/timelines/${device.timelineFile}`);
            if (timelineData?.timeline?.length > 0) {
              const lastWord = timelineData.timeline[timelineData.timeline.length - 1];
              const audioDuration = lastWord.end + 1;
              
              return {
                durationInFrames: Math.ceil(
                  (audioDuration + OUTRO_SECONDS) * FPS
                ),
              };
            }
          } catch (error) {
            console.warn("Could not load timeline data for portrait:", error);
          }

          if (device.audio) {
            try {
              const audioPath = device.audio.replace(/^\/+/, "");
              const audioDuration = await getAudioDurationInSeconds(staticFile(audioPath));
              
              return {
                durationInFrames: Math.ceil(
                  (audioDuration + OUTRO_SECONDS) * FPS
                ),
              };
            } catch (audioError) {
              console.warn("Could not get audio duration for portrait:", audioError);
            }
          }

          return {
            durationInFrames: (30 + OUTRO_SECONDS) * FPS,
          };
        }}
        defaultProps={{
          device: {
            timelineFile: 'samsung-galaxy-s25-ultra.json'
          }
        }}
      />
    </>
  );
};