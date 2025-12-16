/**
 * FIXED FULL AUDIO GENERATOR
 * gTTS chunking + PROPER ffmpeg merge
 */

const fs = require("fs-extra");
const path = require("path");
const gTTS = require("gtts");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

const TIMELINE_DIR = path.join(process.cwd(), "src", "data", "timelines");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");
const TEMP_DIR = path.join(AUDIO_DIR, "_temp");

const LANGUAGE = "en";
const MAX_CHARS = 180; // SAFE gTTS LIMIT

async function generateAudio() {
  // Ensure directories exist
  await fs.ensureDir(AUDIO_DIR);
  await fs.ensureDir(TEMP_DIR);

  const files = await fs.readdir(TIMELINE_DIR);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(TIMELINE_DIR, file);
    const json = await fs.readJSON(filePath);
    
    if (!json.timeline?.length) {
      console.warn(`⚠️ No timeline data in ${file}`);
      continue;
    }

    const fullText = json.timeline.map(w => w.text).join(" ").trim();
    if (!fullText) {
      console.warn(`⚠️ Empty text in ${file}`);
      continue;
    }

    const baseName = path.basename(file, ".json");
    const outputFile = path.join(AUDIO_DIR, `${baseName}.mp3`);

    console.log(`🎙️ Generating audio for: ${file}`);
    console.log(`📝 Text length: ${fullText.length} characters`);

    try {
      // 🔹 Split text safely
      const chunks = splitText(fullText, MAX_CHARS);
      console.log(`📦 Split into ${chunks.length} chunks`);

      const chunkFiles = [];

      // Generate each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = path.join(TEMP_DIR, `chunk-${i}-${Date.now()}.mp3`);
        console.log(`🔹 Generating chunk ${i + 1}/${chunks.length}`);
        
        await new Promise((resolve, reject) => {
          const tts = new gTTS(chunks[i], LANGUAGE);
          tts.save(chunkPath, (err) => {
            if (err) {
              console.error(`❌ Failed to generate chunk ${i}:`, err);
              reject(err);
            } else {
              // Check if file was created
              if (fs.existsSync(chunkPath)) {
                const stats = fs.statSync(chunkPath);
                if (stats.size > 0) {
                  chunkFiles.push(chunkPath);
                  console.log(`✅ Chunk ${i + 1} saved: ${stats.size} bytes`);
                  resolve();
                } else {
                  reject(new Error(`Empty audio file for chunk ${i}`));
                }
              } else {
                reject(new Error(`File not created for chunk ${i}`));
              }
            }
          });
        });
      }

      if (chunkFiles.length === 0) {
        throw new Error("No audio chunks were generated");
      }

      // 🔹 Create concat list file
      const concatFile = path.join(TEMP_DIR, "concat.txt");
      const concatContent = chunkFiles
        .map(f => `file '${f.replace(/\\/g, "/")}'`)
        .join("\n");

      await fs.writeFile(concatFile, concatContent);

      // 🔹 Merge correctly (THIS FIXES 1s BUG)
      console.log(`🔗 Merging ${chunkFiles.length} chunks...`);
      
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions([
            "-acodec libmp3lame",
            "-ab 192k",
            "-ar 44100"
          ])
          .on("start", (command) => {
            console.log(`🚀 FFmpeg command: ${command}`);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              console.log(`📊 Processing: ${Math.round(progress.percent)}%`);
            }
          })
          .on("end", () => {
            console.log(`✅ Merge completed`);
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ FFmpeg error:", err);
            reject(err);
          })
          .save(outputFile);
      });

      // Clean up temp files
      await fs.emptyDir(TEMP_DIR);
      
      // Verify final file
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log(`✅ FULL audio generated: ${outputFile} (${stats.size} bytes)`);
        
        // Update JSON with audio path
        json.audio = `/audio/${baseName}.mp3`;
        await fs.writeJSON(filePath, json, { spaces: 2 });
        console.log(`📝 Updated timeline JSON with audio path`);
      } else {
        console.error(`❌ Output file not created: ${outputFile}`);
      }

    } catch (error) {
      console.error(`❌ Failed to generate audio for ${file}:`, error);
    }
  }

  console.log("🎉 AUDIO GENERATION COMPLETED");
}

// ---------- HELPERS ----------

function splitText(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  
  for (const sentence of sentences) {
    const words = sentence.trim().split(" ");
    let currentChunk = "";
    
    for (const word of words) {
      if ((currentChunk + " " + word).length > maxLen && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? " " : "") + word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }
  
  return chunks;
}

// Run generator
generateAudio().catch(console.error);