/**
 * FIXED FULL AUDIO GENERATOR with TIMESTAMPING
 * 1. Chunks text safely by sentence/length.
 * 2. Measures duration of each resulting audio chunk.
 * 3. Distributes timing proportionally across the original word timeline.
 */

// FIX: Convert CJS requires to ESM imports
import fs from "fs-extra";
import path from "path";
import gTTS from "gtts";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static"; // Renamed for clarity in import

// Set ffmpeg path using the imported module
ffmpeg.setFfmpegPath(ffmpegStatic);

const TIMELINE_DIR = path.join(process.cwd(), "src", "data", "timelines");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");
const TEMP_DIR = path.join(AUDIO_DIR, "_temp");

const LANGUAGE = "en";
const MAX_CHARS = 180; // SAFE gTTS LIMIT

// --- 1. CORE LOGIC ---
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

        // Prepare structured word data for timing (original timeline is preserved here)
        const originalWords = json.timeline;
        const fullText = originalWords.map(w => w.text).join(" ").trim();

        if (!fullText) {
            console.warn(`⚠️ Empty text in ${file}`);
            continue;
        }

        const baseName = path.basename(file, ".json");
        const outputFile = path.join(AUDIO_DIR, `${baseName}.mp3`);

        console.log(`\n--- 🎙️ Processing: ${file} ---`);
        console.log(`📝 Total text length: ${fullText.length} characters`);

        try {
            // 🔹 Step 1: Split text and map to word index boundaries
            const chunkMap = mapWordsToChunks(originalWords, MAX_CHARS);
            console.log(`📦 Split into ${chunkMap.length} chunks`);

            const chunkData = [];
            const chunkFiles = [];

            // 🔹 Step 2: Generate audio for each chunk and measure duration
            let globalStartTime = 0;
            
            for (let i = 0; i < chunkMap.length; i++) {
                const chunk = chunkMap[i];
                const chunkPath = path.join(TEMP_DIR, `chunk-${i}-${Date.now()}.mp3`);
                
                console.log(`\n🔹 Generating chunk ${i + 1}/${chunkMap.length}: ${chunk.text.substring(0, 50)}...`);

                // Generate audio file
                await generateAudioChunk(chunk.text, chunkPath);

                // Measure its exact duration
                const duration = await measureAudioDuration(chunkPath);
                
                chunkFiles.push(chunkPath);

                // Update chunk data with timing information
                chunkData.push({
                    ...chunk,
                    duration,
                    startTime: globalStartTime,
                    endTime: globalStartTime + duration
                });

                globalStartTime += duration;
                console.log(`✅ Chunk ${i + 1} measured: ${duration.toFixed(3)}s. Total duration: ${globalStartTime.toFixed(3)}s`);
            }
            
            if (chunkFiles.length === 0) {
                throw new Error("No audio chunks were generated");
            }


            // 🔹 Step 3: Merge audio files
            await mergeAudioChunks(chunkFiles, outputFile);


            // 🔹 Step 4: Distribute time over individual words
            let newTimeline = [];
            let currentWordIndex = 0;

            for (const chunk of chunkData) {
                const totalWordDuration = chunk.endWordIndex - chunk.startWordIndex;
                let currentChunkTime = chunk.startTime;

                for (let i = chunk.startWordIndex; i < chunk.endWordIndex; i++) {
                    const word = originalWords[i];
                    
                    // Proportionally distribute the chunk's duration over the words it contains
                    // based on word text length relative to total chunk text length.
                    const wordTextLength = word.text.length;
                    const chunkTextLength = chunk.text.length;
                    
                    const wordDurationProportion = wordTextLength / chunkTextLength;
                    const wordDuration = chunk.duration * wordDurationProportion;
                    
                    newTimeline.push({
                        ...word,
                        start: currentChunkTime,
                        end: currentChunkTime + wordDuration,
                        duration: wordDuration,
                    });

                    currentChunkTime += wordDuration;
                }
                currentWordIndex = chunk.endWordIndex;
            }


            // 🔹 Step 5: Final cleanup and JSON update
            await fs.emptyDir(TEMP_DIR);

            if (fs.existsSync(outputFile)) {
                const stats = fs.statSync(outputFile);
                console.log(`\n✅ FULL audio generated: ${outputFile} (${stats.size} bytes)`);

                // Update JSON with new timeline and audio path
                json.audio = `/audio/${baseName}.mp3`;
                json.timeline = newTimeline; 
                
                // Also update phrases, if they exist, by matching words
                if (json.phrases) {
                    json.phrases = updatePhrases(json.phrases, newTimeline);
                }

                await fs.writeJSON(filePath, json, { spaces: 2 });
                console.log(`📝 Updated timeline JSON with ${newTimeline.length} words and audio path.`);
            } else {
                console.error(`❌ Output file not created: ${outputFile}`);
            }

        } catch (error) {
            console.error(`❌ Failed to generate audio for ${file}:`, error);
        }
    }

    console.log("\n🎉 AUDIO GENERATION COMPLETED");
}

// ---------- HELPERS FOR GENERATION ----------

/**
 * Generates and saves a gTTS audio chunk.
 * @param {string} text 
 * @param {string} outputPath 
 */
function generateAudioChunk(text, outputPath) {
    return new Promise((resolve, reject) => {
        const tts = new gTTS(text, LANGUAGE);
        tts.save(outputPath, (err) => {
            if (err) return reject(err);

            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                if (stats.size > 0) {
                    resolve();
                } else {
                    reject(new Error(`Empty audio file created at ${outputPath}`));
                }
            } else {
                reject(new Error(`File not created at ${outputPath}`));
            }
        });
    });
}

/**
 * Measures the duration of an audio file using ffprobe (part of fluent-ffmpeg).
 * @param {string} filePath 
 * @returns {Promise<number>} Duration in seconds
 */
function measureAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, data) => {
            if (err) return reject(err);

            const duration = data.format.duration;
            if (duration && duration > 0) {
                resolve(duration);
            } else {
                // Handle cases where duration is null/0, often meaning a corrupted/empty file
                resolve(0.001); // Resolve minimum duration to avoid dividing by zero
            }
        });
    });
}


/**
 * Merges a list of audio chunks using the ffmpeg concat demuxer.
 * @param {string[]} chunkFiles 
 * @param {string} outputFile 
 */
async function mergeAudioChunks(chunkFiles, outputFile) {
    console.log(`🔗 Merging ${chunkFiles.length} chunks...`);

    const concatFile = path.join(TEMP_DIR, "concat.txt");
    const concatContent = chunkFiles
        .map(f => `file '${f.replace(/\\/g, "/")}'`)
        .join("\n");

    await fs.writeFile(concatFile, concatContent);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatFile)
            .inputOptions(["-f concat", "-safe 0"])
            .outputOptions([
                "-c copy", // Use copy codec for fast, lossless concatenation
            ])
            .on("start", (command) => {
                // console.log(`🚀 FFmpeg command: ${command}`);
            })
            .on("end", () => {
                console.log(`✅ Merge completed`);
                resolve();
            })
            .on("error", (err) => {
                console.error("❌ FFmpeg error during merge:", err.message);
                reject(err);
            })
            .save(outputFile);
    });
}

// ---------- HELPERS FOR TEXT/WORD SPLITTING & JSON UPDATING ----------

/**
 * Splits the timeline words into chunks based on sentence boundaries and MAX_CHARS.
 * Returns a map containing the text, and the start/end index of words in the original timeline.
 * @param {Array<Object>} originalWords 
 * @param {number} maxLen 
 * @returns {Array<Object>} Array of chunk objects {text, startWordIndex, endWordIndex}
 */
function mapWordsToChunks(originalWords, maxLen) {
    const chunks = [];
    let currentChunkText = "";
    let startWordIndex = 0;
    
    // Tracks if the last processed word ended a sentence
    let isSentenceBreak = true; 

    for (let i = 0; i < originalWords.length; i++) {
        const word = originalWords[i];
        const wordText = word.text + (word.punctuation || '');
        const nextChunk = (currentChunkText ? " " : "") + wordText;

        const isOverLimit = currentChunkText.length > 0 && nextChunk.length > maxLen;
        const isEndOfSentence = word.punctuation && /[.!?]/.test(word.punctuation);
        
        // Condition for cutting the chunk:
        // 1. If adding the new word/punctuation exceeds the max length, OR
        // 2. If it's a new sentence (and not the very start of the process).
        if (isOverLimit || (isSentenceBreak && currentChunkText.length > 0)) {
            // Finalize the previous chunk
            chunks.push({
                text: currentChunkText.trim(),
                startWordIndex,
                endWordIndex: i // The current word starts the new chunk
            });
            
            // Start a new chunk
            currentChunkText = wordText;
            startWordIndex = i;
        } else {
            // Continue the current chunk
            currentChunkText += nextChunk;
        }
        
        isSentenceBreak = isEndOfSentence;

        // If this is the last word, push the final chunk
        if (i === originalWords.length - 1) {
            chunks.push({
                text: currentChunkText.trim(),
                startWordIndex,
                endWordIndex: originalWords.length
            });
        }
    }

    return chunks;
}

/**
 * Updates the phrase objects with correct start/end times based on the new timeline.
 * @param {Array<Object>} phrases 
 * @param {Array<Object>} newTimeline 
 * @returns {Array<Object>} Updated phrases
 */
function updatePhrases(phrases, newTimeline) {
    if (!phrases || phrases.length === 0) return [];

    // The current word objects in the timeline are indexed 0 to N-1.
    // We assume the structure and order of words in phrases match the newTimeline.
    
    let currentWordIndex = 0;
    const updatedPhrases = [];

    for (const phrase of phrases) {
        const wordCount = phrase.words ? phrase.words.length : 0;
        
        if (wordCount === 0 || currentWordIndex >= newTimeline.length) {
            continue;
        }

        const firstWord = newTimeline[currentWordIndex];
        const lastWordIndex = currentWordIndex + wordCount - 1;
        const lastWord = newTimeline[lastWordIndex];

        if (lastWord) {
            updatedPhrases.push({
                ...phrase,
                start: firstWord.start,
                end: lastWord.end,
                duration: lastWord.end - firstWord.start,
                // Optionally update the words array itself with full timing data
                words: newTimeline.slice(currentWordIndex, lastWordIndex + 1)
            });
        }
        
        currentWordIndex += wordCount;
    }

    return updatedPhrases;
}

// Run generator
generateAudio().catch(console.error);