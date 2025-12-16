import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url"; // 💡 ADDED pathToFileURL

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read devices from file using dynamic import
async function loadDevices() {
  try {
    const devicesPath = path.join(process.cwd(), "src", "data", "device.js");
    const deviceUrl = pathToFileURL(devicesPath).toString();

    // Use dynamic import for ES modules
    const deviceModule = await import(deviceUrl);
    return deviceModule.devices;
  } catch (error) {
    console.error("❌ Error loading devices:", error.message);
    
    // Fallback to hardcoded devices
    console.log("⚠️ Using fallback device data");
    return [
      {
        model: "Samsung Galaxy S25 Ultra",
        overview: "The definitive Android flagship of 2025 with top level performance and camera quality.",
        videoScript: "The Samsung Galaxy S25 Ultra is one of the most powerful Android smartphones of 2025.",
        images: {
          img1: "https://media.gadgetbytenepal.com/2025/01/Samsung-Galaxy-S25-Ultra-Titanium-Grey.jpg"
        },
        specs: [
          { label: "Display", value: "6.9-inch Dynamic AMOLED 2X" },
          { label: "Camera", value: "200MP Quad Camera" },
          { label: "Battery", value: "5000mAh" }
        ]
      }
    ];
  }
}

/* Output directory */
const OUT_DIR = path.join(process.cwd(), "out");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

/* Render videos concurrently */
async function renderAll() {
  try {
    const devices = await loadDevices();
    
    if (!devices || devices.length === 0) {
      console.error("❌ No devices found to render");
      return;
    }
    
    console.log(`📱 Found ${devices.length} device(s) to render`);
    
    // 1. Array to hold all rendering promises
    const renderPromises = [];

    for (const device of devices) {
      const slug = device.model
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const outputFile = path.join(OUT_DIR, `${slug}.mp4`);
      const propsFilePath = path.join(OUT_DIR, `${slug}-props.json`);

      // Ensure features array exists for the TechVideo component
      const features = device.specs?.map(spec => ({
        label: spec.label,
        value: spec.value
      })) || [];

      const propsObject = {
        device: {
          model: device.model,
          overview: device.overview,
          videoScript: device.videoScript,
          images: device.images,
          specs: device.specs,
          features: features,
          timelineFile: `${slug}.json`,
          audio: `/audio/${slug}.mp3`,
        },
      };

      /* Write props file */
      fs.writeFileSync(propsFilePath, JSON.stringify(propsObject, null, 2));
      console.log(`📄 Created props file: ${propsFilePath}`);

      const command = [
        "npx remotion render",
        "src/index.ts",
        "TechVideo",
        `"${outputFile}"`,
        `--props="${propsFilePath}"`,
        "--codec=h264",
        "--overwrite",
        "--concurrency=2"
      ].join(" ");

      console.log(`\n🎬 Starting render for: ${device.model}`);
      console.log(`🎯 Output: ${outputFile}`);

      // 2. Create the promise without 'await' in the loop
      const renderPromise = new Promise((resolve, reject) => {
        const childProcess = exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ FAILED: ${device.model}`);
            console.error("Error details:", stderr || error.message);
            resolve(); // Continue with next device instead of stopping
          } else {
            console.log(`✅ DONE: ${outputFile}`);
            resolve();
          }
        });

        // Log output in real-time
        childProcess.stdout?.on('data', (data) => {
          if (data.includes('Frame') || data.includes('Rendering')) {
            // Optional: Add device model to log for clarity when running concurrently
            process.stdout.write(`[${device.model}] ${data}`); 
          }
        });
      });
      
      // 3. Add the promise to the array
      renderPromises.push(renderPromise);
    }

    // 4. Wait for ALL rendering processes to finish simultaneously
    await Promise.all(renderPromises);

    console.log("\n🎉 ALL VIDEOS RENDERED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Fatal error in renderAll:", error);
  }
}

// Run the renderer
renderAll().catch(console.error);