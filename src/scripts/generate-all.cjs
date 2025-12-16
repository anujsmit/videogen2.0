const { exec } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');

const devices = [
  'iphone-17-pro',
  'galaxy-s25-ultra',
  'google-pixel-9-pro'
];

async function renderAllDevices() {
  console.log(`Starting batch render of ${devices.length} devices...`);
  
  for (const deviceId of devices) {
    console.log(`\n📱 Rendering: ${deviceId}`);
    
    const outputPath = `out/${deviceId}.mp4`;
    
    // Create command
    const command = `npm run build -- --props='{"deviceId":"${deviceId}"}' --codec=h264 --output=${outputPath}`;
    
    try {
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`❌ Error rendering ${deviceId}:`, error.message);
            reject(error);
          } else {
            console.log(`✅ Successfully rendered: ${outputPath}`);
            resolve();
          }
        });
      });
      
      // Add delay between renders to prevent system overload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to render ${deviceId}, continuing...`);
    }
  }
  
  console.log('\n🎉 Batch render complete!');
}

renderAllDevices();