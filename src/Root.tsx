import React from "react";
import { Composition, staticFile, getInputProps, AbsoluteFill } from "remotion";
import { TechVideo } from "./compositions/TechVideo";
import { WordSequence } from "./components/WordSequence";
import { Layout } from "./components/Layout";

// Import individual device data files
import iphoneData from "./data/timelines/apple-iphone-17-pro.json";

// Define DeviceData interface
interface DeviceData {
  model: string;
  timeline: any[];
  images: { [key: string]: string };
  specs: Array<{ label: string; value: string }>;
  overview: string;
  audio?: string;
  totalDuration?: number;
  phrases?: any[];
}

// Create devices object manually
const devices: Record<string, DeviceData> = {
  'iphone-17-pro': iphoneData as DeviceData,
};

// Get all device IDs
const getAllDeviceIds = (): string[] => {
  return Object.keys(devices);
};

// Get device by ID
const getDeviceById = (deviceId: string): DeviceData | null => {
  return devices[deviceId] || null;
};

// Sample data for WordSequence demo
const sampleTimeline = [
  { text: "Innovation", start: 0, end: 2 },
  { text: "Meets", start: 2, end: 4 },
  { text: "Design", start: 4, end: 6 },
];

// Constants
const FPS = 30;
const OUTRO_SECONDS = 18;

// Helper function to calculate duration
const calculateVideoDuration = (deviceData: DeviceData) => {
  const totalDuration = deviceData.totalDuration || 
                       (deviceData.timeline?.[deviceData.timeline.length - 1]?.end || 0);
  return Math.ceil((totalDuration + OUTRO_SECONDS) * FPS);
};

export const Root: React.FC = () => {
  // Get device ID from CLI props if provided
  const inputProps = getInputProps();
  const specificDeviceId = inputProps.deviceId;
  
  return (
    <>
      {/* ===============================
          DYNAMIC DEVICE COMPOSITIONS (One per device)
      =============================== */}
      {getAllDeviceIds().map((deviceId) => {
        const deviceData = devices[deviceId];
        if (!deviceData) return null;
        
        const compositionName = deviceData.model.replace(/\s+/g, '-');
        const duration = calculateVideoDuration(deviceData);
        
        return (
          <Composition
            key={deviceId}
            id={`TechVideo-${compositionName}`}
            component={TechVideo}
            fps={FPS}
            width={1920}
            height={1080}
            durationInFrames={duration}
            defaultProps={{
              device: deviceData
            }}
          />
        );
      })}
      
      {/* ===============================
          DYNAMIC PORTRAIT COMPOSITIONS
      =============================== */}
      {getAllDeviceIds().map((deviceId) => {
        const deviceData = devices[deviceId];
        if (!deviceData) return null;
        
        const compositionName = `Portrait-${deviceData.model.replace(/\s+/g, '-')}`;
        const duration = calculateVideoDuration(deviceData);
        
        return (
          <Composition
            key={`portrait-${deviceId}`}
            id={compositionName}
            component={TechVideo}
            fps={FPS}
            width={1080}
            height={1920}
            durationInFrames={duration}
            defaultProps={{
              device: deviceData
            }}
          />
        );
      })}

      {/* ===============================
          GENERIC COMPOSITION (Takes deviceId as prop)
          Useful for CLI rendering of specific devices
      =============================== */}
      <Composition
        id="TechVideo-Generic"
        component={({ deviceId }: { deviceId: string }) => {
          const deviceData = getDeviceById(deviceId) || devices['iphone-17-pro'];
          return <TechVideo device={deviceData} />;
        }}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={30 * 60} // 30 seconds default
        defaultProps={{
          deviceId: 'iphone-17-pro'
        }}
      />

      {/* ===============================
          BATCH RENDER COMPOSITION (For rendering all at once)
      =============================== */}
      <Composition
        id="Batch-Render"
        component={() => {
          const allDevices = getAllDeviceIds();
          return (
            <AbsoluteFill style={{ backgroundColor: '#0b0b0f', color: 'white', padding: 40 }}>
              <h1>Batch Render Ready</h1>
              <p>Devices available for rendering:</p>
              <ul>
                {allDevices.map(id => (
                  <li key={id}>{devices[id].model}</li>
                ))}
              </ul>
            </AbsoluteFill>
          );
        }}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={FPS * 5}
      />

      {/* ===============================
          WORD SEQUENCE DEMO (unchanged)
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
    </>
  );
};