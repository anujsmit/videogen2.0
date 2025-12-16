import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { devices } from "../../data/device.js";

const OUT_DIR = path.join(process.cwd(), "out");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const device of devices) {
  const slug = device.model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const outputFile = path.join(OUT_DIR, `${slug}.mp4`);

  const props = JSON.stringify({
    device: {
      ...device,
      audio: `/audio/${slug}.mp3`,
      timelineFile: `${slug}.json`,
    },
  });

  const command = [
    "npx remotion render",
    "src/index.ts",
    "TechVideo",
    outputFile,
    `--props='${props}'`,
    "--codec=h264",
    "--overwrite",
    "--concurrency=4",
  ].join(" ");

  console.log(`🎬 Rendering → ${device.model}`);

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`❌ FAILED: ${device.model}`);
      console.error(stderr || err.message);
      return;
    }
    console.log(`✅ DONE: ${outputFile}`);
  });
}
