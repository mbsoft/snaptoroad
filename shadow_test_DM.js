const fs = require('fs');
const path = require('path');
const axios = require('axios');

const LOG_FILE = './geotab_com_summary.log';
const OUTPUT_FILE = './geotab_com_summary_updated.csv';
const ENDPOINT = 'https://api.nextbillion.io/distancematrix/json-concise?key=73d4bee8352b46e483d75fb924889ada&option=flexible';

(async () => {
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean);
  const updatedLines = [];
  let count = 0;
  for (const line of lines) {
    const parts = line.trim().split(/\t+/).map(s => s.trim());
    const [timestampRaw, source, label, count2] = parts;
    const previousTime = parts[4] ? parts[4].replace(/ms$/, '') : '';

    // Normalize timestamp back to ISO format
    const timestamp = timestampRaw.split('T')[1].replace(/-/g, ':').replace(/:(\d+)$/, '.$1');

    const jsonFileName = `geotab_com_${timestampRaw}.json`;
    const jsonFilePath = path.join(__dirname, jsonFileName);
    try {
      count++;
      if (count > 10) {
        break;
      }
      // Split on tab or whitespace and get the first field
      const parts = line.trim().split(/\s+/);
      const baseName = parts[0]; // e.g., "geotab_com_2025-05-01T20-45-53-599Z"
      const filename = `geotab_com_${baseName}.json`;
      const jsonPath = path.resolve(filename);
      console.log(jsonPath); 
      if (!fs.existsSync(jsonPath)) {
        updatedLines.push(`${line} - JSON file not found`);
        continue;
      }

      const rawData = fs.readFileSync(jsonPath, 'utf-8');
      const jsonBody = JSON.parse(rawData);

      // Remove 'context' key if present
      delete jsonBody.context;

      const startTime = performance.now();

      const response = await axios.post(ENDPOINT, jsonBody);
      const endTime = performance.now();
      const elapsed = (endTime - startTime).toFixed(2);

      updatedLines.push(`${timestamp},${source},${label},${count2},${previousTime.replace('ms', '')},${elapsed}`);
    } catch (err) {
        updatedLines.push(`${timestamp},${source},${label},${count2},${previousTime.replace('ms', '')},999`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, updatedLines.join('\n'), 'utf-8');
  console.log(`✅ Updated log written to ${OUTPUT_FILE}`);
})();