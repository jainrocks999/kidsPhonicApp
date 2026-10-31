const fs = require("fs");
const path = require("path");

const AUDIO_DIR = path.join(__dirname, "rn_assets/audio");
const OUTPUT_FILE = path.join(AUDIO_DIR, "index.js");

const extensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];

function getFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getFiles(fullPath);
    }

    return extensions.includes(path.extname(entry.name).toLowerCase())
      ? [fullPath]
      : [];
  });
}

const files = getFiles(AUDIO_DIR).filter(
  (file) => file !== OUTPUT_FILE
);

const audio = files.map((file) => {
  const relativePath = "./" + path.relative(AUDIO_DIR, file).split(path.sep).join("/");
  const name = path
    .basename(file, path.extname(file))
    .replace(/[^a-zA-Z0-9_$]/g, "_");

  return `  "${name}": require("${relativePath}"),`;
});

fs.writeFileSync(
  OUTPUT_FILE,
  `// Auto-generated file. Do not edit manually.\n\nconst audio = {\n${audio.join("\n")}\n};\n\nexport default audio;\n`
);

console.log(`Found ${files.length} audio files`);
console.log(`Generated: ${OUTPUT_FILE}`);