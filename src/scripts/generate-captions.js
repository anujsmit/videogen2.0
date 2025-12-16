const fs = require("fs-extra");
const path = require("path");
const { devices } = require("../../data/device");

const OUTPUT_DIR = path.join(process.cwd(), "src", "data", "timelines");

fs.ensureDirSync(OUTPUT_DIR);

// Enhanced timing algorithm (like CapCut)
function textToTimeline(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let timeline = [];
  let currentTime = 0;
  
  sentences.forEach((sentence) => {
    const words = sentence.trim().split(/\s+/);
    const sentenceDuration = Math.max(2, words.length * 0.35); // Base duration
    
    words.forEach((word, index) => {
      const wordDuration = calculateWordDuration(word);
      const start = currentTime; // Start time is the current time
      const end = start + wordDuration;
      
      timeline.push({
        type: "word",
        text: word.replace(/[.,!?]+$/, ""), // Clean punctuation
        start: +start.toFixed(2),
        end: +end.toFixed(2),
        punctuation: word.match(/[.,!?]+$/)?.[0] || "",
      });

      currentTime = end; // Update current time after adding the word
    });
    
    // Add pause after sentence
    currentTime += 0.3;
  });
  
  return timeline;
}

function calculateWordDuration(word) {
  const baseDuration = 0.3;
  const lengthFactor = Math.min(word.length * 0.05, 0.2);
  const complexityFactor = /[0-9]/.test(word) ? 0.1 : 0;
  
  return baseDuration + lengthFactor + complexityFactor;
}

// Generate enhanced timeline with metadata
devices.forEach((device) => {
  const modelSlug = device.model.toLowerCase().replace(/\s+/g, "-");
  
  const timeline = textToTimeline(device.videoScript);
  
  // Calculate total duration based on the last word's end time
  const totalDuration = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
  
  // Split into phrases for better caption grouping
  const phrases = groupIntoPhrases(timeline);
  
  const json = {
    model: device.model,
    overview: device.overview,
    audio: `/audio/${modelSlug}.mp3`,
    timeline,
    phrases,
    totalDuration: +totalDuration.toFixed(2),
    images: device.images,
    specs: device.specs,
    metadata: {
      wordCount: timeline.length,
      estimatedDuration: totalDuration,
      generatedAt: new Date().toISOString(),
    },
  };
  
  const outPath = path.join(OUTPUT_DIR, `${modelSlug}.json`);
  fs.writeJSONSync(outPath, json, { spaces: 2 });
  
  console.log(`✅ Enhanced timeline generated (Duration: ${totalDuration.toFixed(2)}s): ${outPath}`);
});

function groupIntoPhrases(timeline) {
  const phrases = [];
  let currentPhrase = [];
  let phraseStart = timeline[0]?.start || 0;
  
  timeline.forEach((word, index) => {
    currentPhrase.push(word);
    
    // End phrase at punctuation or after 4-6 words
    const hasPunctuation = word.punctuation;
    const shouldEndPhrase = hasPunctuation || 
      currentPhrase.length >= 5 || 
      (index < timeline.length - 1 && 
       timeline[index + 1].start - word.end > 0.5);
    
    if (shouldEndPhrase) {
      phrases.push({
        words: [...currentPhrase],
        start: phraseStart,
        end: word.end,
        text: currentPhrase.map(w => w.text).join(" ") + (word.punctuation || ""),
      });
      currentPhrase = [];
      phraseStart = timeline[index + 1]?.start || 0;
    }
  });
  
  return phrases;
}