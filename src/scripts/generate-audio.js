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
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const TEMP_DIR = path.join(AUDIO_DIR, "_temp");

const LANGUAGE = "en";
const MAX_CHARS = 180; // SAFE gTTS LIMIT

async function generateAudio() {
  await fs.ensureDir(AUDIO_DIR);
  await fs.ensureDir(TEMP_DIR);

  const files = await fs.readdir(TIMELINE_DIR);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const json = await fs.readJSON(path.join(TIMELINE_DIR, file));
    if (!json.timeline?.length) continue;

    const fullText = json.timeline.map(w => w.text).join(" ").trim();
    if (!fullText) continue;

    const outputFile = path.join(
      AUDIO_DIR,
      path.basename(file, ".json") + ".mp3"
    );

    console.log(`🎙️ Generating audio for: ${file}`);

    // 🔹 Split text safely
    const chunks = splitText(fullText, MAX_CHARS);

    const chunkFiles = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = path.join(TEMP_DIR, `chunk-${i}.mp3`);
      const tts = new gTTS(chunks[i], LANGUAGE);

      await new Promise((resolve, reject) => {
        tts.save(chunkPath, err => err ? reject(err) : resolve());
      });

      chunkFiles.push(chunkPath);
    }

    // 🔹 Create concat list file
    const concatFile = path.join(TEMP_DIR, "concat.txt");
    const concatContent = chunkFiles
      .map(f => `file '${f.replace(/\\/g, "/")}'`)
      .join("\n");

    await fs.writeFile(concatFile, concatContent);

    // 🔹 Merge correctly (THIS FIXES 1s BUG)
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-acodec libmp3lame",
          "-ab 192k",
          "-ar 44100"
        ])
        .save(outputFile)
        .on("end", resolve)
        .on("error", reject);
    });

    await fs.emptyDir(TEMP_DIR);

    console.log(`✅ FULL audio generated: ${outputFile}`);
  }

  console.log("🎉 ALL AUDIO GENERATED CORRECTLY");
}

// ---------- HELPERS ----------

function splitText(text, maxLen) {
  const words = text.split(" ");
  const chunks = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).length > maxLen) {
      chunks.push(current);
      current = word;
    } else {
      current += (current ? " " : "") + word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

generateAudio().catch(console.error);
