// monitor.js
const fs = require("fs");
const readline = require("readline");

const org_input = "tread.io"; // or "all"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

let buffer = "";
let openBraces = 0;

function extractRequestBody(entry) {
  const labels = entry.labels || {};
  if (labels.endpoint !== "nbroutes-optimization-v2-post") return;
  if (org_input !== "all" && labels.org_code !== org_input) return;

  const raw = entry.request_body;
  if (!raw) return;

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    console.warn(`[warn] Failed to parse request_body: ${e}`);
    return;
  }

  const org = (labels.org_code || "unknown_org").replace(/[^\w\-]/g, "_");
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `parsed_logs/${org}_${now}.json`;

  fs.mkdirSync("parsed_logs", { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(body, null, 2));
  console.log(`✅ Saved: ${filename}`);
}

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // Update bracket counters
  openBraces += (trimmed.match(/{/g) || []).length;
  openBraces -= (trimmed.match(/}/g) || []).length;

  buffer += trimmed;

  if (openBraces === 0 && buffer) {
    try {
      const entry = JSON.parse(buffer);
      extractRequestBody(entry);
    } catch (e) {
      console.warn(`[warn] Failed to parse buffered JSON: ${e.message}`);
    }
    buffer = "";
  } else {
    buffer += "\n";
  }
});