const fs = require("fs");
const path = require("path");

const AUDIO_DIR = path.join(__dirname, "rn_assets/audio");
const OUTPUT_FILE = path.join(AUDIO_DIR, "index.js");

const extensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];

const files = fs
  .readdirSync(AUDIO_DIR)
  .filter((file) => extensions.includes(path.extname(file).toLowerCase()))
  .sort();

const toVariableName = (filename) =>
  path
    .basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9_$]/g, "_")
    .replace(/^(\d)/, "_$1");

const imports = files.map((file) => {
  const name = toVariableName(file);
  return `  ${name}: require("./${file}"),`;
});

const content = `// Auto-generated file. Do not edit manually.

const audio = {
${imports.join("\n")}
};

export default audio;
`;

fs.writeFileSync(OUTPUT_FILE, content);

console.log(`Generated ${files.length} audio assets in rn_assets/audio/index.js`);