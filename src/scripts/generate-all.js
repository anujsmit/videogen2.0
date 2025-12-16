import { exec } from "child_process";
import path from "path";
import fs from "fs";
// 💡 FIX: Import pathToFileURL to correctly handle file paths on Windows
import { fileURLToPath, pathToFileURL } from "url";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory where JSON timeline files are located
const TIMELINES_DIR = path.join(process.cwd(), "src", "data", "timelines");

/* Output directories */
const OUT_DIR = path.join(process.cwd(), "out");
const VIDEO_OUT_DIR = path.join(OUT_DIR, "video");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
// 💡 Ensure nested video directory exists
if (!fs.existsSync(VIDEO_OUT_DIR)) {
    fs.mkdirSync(VIDEO_OUT_DIR, { recursive: true });
}

// Track timing statistics
const timingStats = {
  totalStartTime: 0,
  filesProcessed: 0,
  totalVideos: 0,
  totalTime: 0,
  individualTimes: []
};

console.log("=".repeat(70));
console.log("🚀 STARTING VIDEO RENDER PROCESS");
console.log("=".repeat(70));
console.log(`📁 Timelines directory: ${TIMELINES_DIR}`);
console.log(`📂 Output directory: ${VIDEO_OUT_DIR}`);
console.log(`⏰ Start time: ${new Date().toLocaleTimeString()}`);
console.log("=".repeat(70));

/* Format time in human-readable format */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/* Calculate ETA based on average time */
function calculateETA(filesRemaining, avgTimePerFile) {
  const totalMsRemaining = filesRemaining * avgTimePerFile;
  return new Date(Date.now() + totalMsRemaining).toLocaleTimeString();
}

/* Render videos from JSON timeline files - ONE BY ONE */
async function renderAllFromTimelines() {
  try {
    // Get all JSON files from the timelines directory
    let jsonFiles = [];
    
    if (fs.existsSync(TIMELINES_DIR)) {
      jsonFiles = fs.readdirSync(TIMELINES_DIR)
        .filter(file => file.endsWith('.json'))
        .sort() // Sort files alphabetically
        .map(file => ({
          filename: file,
          filepath: path.join(TIMELINES_DIR, file),
          slug: file.replace('.json', '') // Remove .json extension for slug
        }));
    }
    
    if (jsonFiles.length === 0) {
      console.error("❌ No JSON timeline files found in:", TIMELINES_DIR);
      return;
    }
    
    timingStats.totalVideos = jsonFiles.length;
    timingStats.totalStartTime = Date.now();
    
    console.log(`📊 Found ${jsonFiles.length} timeline JSON file(s) to render`);
    console.log(`📋 Files: ${jsonFiles.map(f => f.filename).join(', ')}`);
    console.log("=".repeat(70));
    
    // Process files ONE BY ONE (sequentially)
    for (let i = 0; i < jsonFiles.length; i++) {
      const jsonFile = jsonFiles[i];
      const { filename, filepath, slug } = jsonFile;
      const fileStartTime = Date.now();
      
      console.log(`\n🎬 RENDERING VIDEO ${i + 1} OF ${jsonFiles.length}`);
      console.log("─".repeat(70));
      
      // Extract device name from filename or use slug
      let deviceName = slug;
      
      try {
        // Try to read device name from JSON file
        const jsonContent = fs.readFileSync(filepath, 'utf-8');
        const timelineData = JSON.parse(jsonContent);
        
        // Check if JSON has a device name property
        if (timelineData.deviceName) {
          deviceName = timelineData.deviceName;
        } else if (timelineData.model) {
          deviceName = timelineData.model;
        }
      } catch (error) {
        console.warn(`⚠️ Could not read device name from ${filename}, using filename as device name`);
      }
      
      // Create a clean filename for the video
      const cleanDeviceName = deviceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      // Output path: out/video/{cleanDeviceName}.mp4
      const outputFile = path.join(VIDEO_OUT_DIR, `${cleanDeviceName}.mp4`);
      
      // Build the remotion command
      const command = [
        "npx remotion render",
        "src/index.ts",
        "TechVideo",
        `"${outputFile}"`,
        `--props="${filepath}"`,
        `--codec=h264`,
        `--overwrite`,
        `--concurrency=2`
      ].join(" ");

      console.log(`📱 Device: ${deviceName}`);
      console.log(`📄 Timeline: ${filename}`);
      console.log(`🎯 Output: ${outputFile}`);
      console.log(`⏰ Start: ${new Date().toLocaleTimeString()}`);
      
      // Calculate ETA if we have previous render times
      if (timingStats.individualTimes.length > 0) {
        const avgTime = timingStats.individualTimes.reduce((a, b) => a + b, 0) / timingStats.individualTimes.length;
        const filesRemaining = jsonFiles.length - i;
        const eta = calculateETA(filesRemaining, avgTime);
        console.log(`⏳ Estimated completion: ${eta}`);
      }
      
      console.log("─".repeat(70));
      
      // Track frame progress
      let currentFrame = 0;
      let totalFrames = 0;
      let renderStage = "Starting...";
      let lastUpdate = Date.now();
      
      // Execute ONE command at a time and wait for it to complete
      await new Promise((resolve, reject) => {
        console.log("🔄 Starting render process...\n");
        
        const childProcess = exec(command, (error, stdout, stderr) => {
          const fileEndTime = Date.now();
          const fileDuration = fileEndTime - fileStartTime;
          timingStats.individualTimes.push(fileDuration);
          timingStats.filesProcessed++;
          
          console.log("\n" + "─".repeat(70));
          if (error) {
            console.error(`❌ FAILED: ${deviceName}`);
            console.error(`⏱️ Time taken: ${formatTime(fileDuration)}`);
            console.error(`📛 Error: ${stderr || error.message}`);
            console.log("─".repeat(70));
            resolve();
          } else {
            console.log(`✅ SUCCESS: ${deviceName}`);
            console.log(`📁 Saved to: ${outputFile}`);
            console.log(`⏱️ Render time: ${formatTime(fileDuration)}`);
            console.log(`🎞️ Frames rendered: ${totalFrames || 'Unknown'}`);
            console.log("─".repeat(70));
            
            // Show overall progress
            const filesLeft = jsonFiles.length - timingStats.filesProcessed;
            const avgTime = timingStats.individualTimes.reduce((a, b) => a + b, 0) / timingStats.individualTimes.length;
            const totalTimeSoFar = Date.now() - timingStats.totalStartTime;
            const estimatedTotalTime = avgTime * jsonFiles.length;
            const percentComplete = (timingStats.filesProcessed / jsonFiles.length) * 100;
            
            console.log(`📊 Progress: ${timingStats.filesProcessed}/${jsonFiles.length} (${percentComplete.toFixed(1)}%)`);
            console.log(`⏱️ Elapsed: ${formatTime(totalTimeSoFar)}`);
            
            if (filesLeft > 0) {
              const timeLeft = avgTime * filesLeft;
              console.log(`⏳ Remaining: ~${formatTime(timeLeft)}`);
              console.log(`🎯 ETA: ${new Date(Date.now() + timeLeft).toLocaleTimeString()}`);
            }
            
            console.log("─".repeat(70));
            resolve();
          }
        });

        // Parse output for progress information
        childProcess.stdout?.on('data', (data) => {
          const lines = data.toString().split('\n');
          
          lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // Extract frame information
            const frameMatch = line.match(/Frame (\d+) of (\d+)/);
            if (frameMatch) {
              currentFrame = parseInt(frameMatch[1]);
              totalFrames = parseInt(frameMatch[2]);
              const percent = ((currentFrame / totalFrames) * 100).toFixed(1);
              const now = Date.now();
              
              // Update progress every 500ms or when frame changes significantly
              if (now - lastUpdate > 500 || currentFrame === totalFrames) {
                const elapsed = now - fileStartTime;
                const framesPerMs = currentFrame / elapsed;
                const remainingFrames = totalFrames - currentFrame;
                const remainingTime = framesPerMs > 0 ? remainingFrames / framesPerMs : 0;
                
                // Create progress bar
                const progressWidth = 40;
                const filled = Math.round((currentFrame / totalFrames) * progressWidth);
                const progressBar = '█'.repeat(filled) + '░'.repeat(progressWidth - filled);
                
                console.log(`\r📊 ${progressBar} ${percent}% (${currentFrame}/${totalFrames}) | ⏱️ ${formatTime(remainingTime)} remaining`);
                lastUpdate = now;
              }
            }
            
            // Track render stage
            if (line.includes('Rendering')) {
              renderStage = line;
            } else if (line.includes('Composing')) {
              renderStage = line;
            } else if (line.includes('Encoding')) {
              renderStage = line;
            }
          });
        });
        
        childProcess.stderr?.on('data', (data) => {
          const line = data.toString().trim();
          if (line.includes('warning') || line.includes('error')) {
            console.log(`⚠️ ${line}`);
          }
        });
      });
      
      // Small delay between renders
      if (i < jsonFiles.length - 1) {
        console.log(`\n⏱️ Next render starts in 3 seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Final summary
    timingStats.totalTime = Date.now() - timingStats.totalStartTime;
    
    console.log("\n" + "🎉".repeat(25));
    console.log("🎉 ALL VIDEOS RENDERED SUCCESSFULLY!");
    console.log("🎉".repeat(25));
    console.log("=".repeat(70));
    console.log("📊 FINAL STATISTICS");
    console.log("=".repeat(70));
    console.log(`📅 Date: ${new Date().toLocaleDateString()}`);
    console.log(`⏰ Total time: ${formatTime(timingStats.totalTime)}`);
    console.log(`📁 Total videos: ${timingStats.filesProcessed}`);
    
    if (timingStats.individualTimes.length > 0) {
      const avgTime = timingStats.individualTimes.reduce((a, b) => a + b, 0) / timingStats.individualTimes.length;
      const minTime = Math.min(...timingStats.individualTimes);
      const maxTime = Math.max(...timingStats.individualTimes);
      
      console.log(`📈 Average per video: ${formatTime(avgTime)}`);
      console.log(`⚡ Fastest render: ${formatTime(minTime)}`);
      console.log(`🐢 Slowest render: ${formatTime(maxTime)}`);
      console.log(`⏱️ Start time: ${new Date(timingStats.totalStartTime).toLocaleTimeString()}`);
      console.log(`⏱️ End time: ${new Date().toLocaleTimeString()}`);
    }
    
    console.log(`📂 Output directory: ${VIDEO_OUT_DIR}`);
    console.log("=".repeat(70));
    
  } catch (error) {
    console.error("\n❌ Fatal error in renderAllFromTimelines:", error);
  }
}

// Main function
async function main() {
  console.log("🔧 Initializing video render system...\n");
  
  // Check if timelines directory exists
  if (!fs.existsSync(TIMELINES_DIR)) {
    console.error(`❌ ERROR: Timelines directory not found: ${TIMELINES_DIR}`);
    console.log("💡 Please ensure your JSON timeline files are in src/data/timelines/");
    return;
  }
  
  // Check if src/index.ts exists
  const indexPath = path.join(process.cwd(), "src", "index.ts");
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ ERROR: Remotion entry file not found: ${indexPath}`);
    console.log("💡 Please ensure your Remotion project structure is correct");
    return;
  }
  
  console.log("✅ All checks passed!");
  console.log("=".repeat(70));
  
  // Start rendering
  await renderAllFromTimelines();
  
  console.log("\n" + "🏁".repeat(25));
  console.log("🏁 PROCESS COMPLETED");
  console.log("🏁".repeat(25));
}

// Run the main function
main().catch(error => {
  console.error("\n💥 UNEXPECTED ERROR:", error);
  process.exit(1);
});