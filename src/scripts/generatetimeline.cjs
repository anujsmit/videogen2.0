const fs = require("fs-extra");
const path = require("path");
const { devices } = require("../../data/device");
const OUTPUT_DIR = path.join(process.cwd(), "src", "data", "timelines");
fs.ensureDirSync(OUTPUT_DIR);

// ✅ FIXED sentence parsing
function textToTimeline(text) {
  const sentences =
    text.match(/[^.!?]+[.!?]*/g)?.filter(Boolean) ||
    [text];

  let timeline = [];
  let currentTime = 0;

  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);

    words.forEach(word => {
      const clean = word.replace(/[.,!?]+$/, "");
      const punctuation = word.match(/[.,!?]+$/)?.[0] || "";

      const duration = calculateWordDuration(clean);
      const start = currentTime;
      const end = start + duration;

      timeline.push({
        type: "word",
        text: clean,
        start: +start.toFixed(2),
        end: +end.toFixed(2),
        punctuation
      });

      currentTime = end;
    });

    // pause after sentence
    currentTime += 0.3;
  });
  return timeline;
}

function calculateWordDuration(word) {
  return 0.3 + Math.min(word.length * 0.04, 0.2);
}

// 🔹 GENERATE FILES
devices.forEach(device => {
  const slug = device.model.toLowerCase().replace(/\s+/g, "-");
  const timeline = textToTimeline(device.videoScript);

  const json = {
    model: device.model,
    overview: device.overview,
    audio: `/audio/${slug}.mp3`,
    timeline,
    totalDuration: timeline.at(-1)?.end || 0,
    images: device.images,
    features: device.specs, // FIXED: Changed 'specs' to 'features' to match usage in TechVideo.tsx
    metadata: {
      wordCount: timeline.length,
      generatedAt: new Date().toISOString()
    }
  };

  const out = path.join(OUTPUT_DIR, `${slug}.json`);
  fs.writeJSONSync(out, json, { spaces: 2 });

  console.log(`✅ Timeline 
  generated: ${slug} (${timeline.length} words)`);
});