import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "dist-pages");

const ROOT_FILES = [
  "index.html",
  "app.js",
  "styles.css",
  "sw.js",
  "manifest.webmanifest",
  "README.md"
];

const DIRECTORIES = ["assets", "data"];

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function emptyDirectory(directory) {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  fs.mkdirSync(directory, { recursive: true });
}

function main() {
  emptyDirectory(OUTPUT_DIR);

  for (const file of ROOT_FILES) {
    copyFile(path.join(ROOT, file), path.join(OUTPUT_DIR, file));
  }

  for (const directory of DIRECTORIES) {
    copyDirectory(path.join(ROOT, directory), path.join(OUTPUT_DIR, directory));
  }

  console.log(`Built Cloudflare Pages output in ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main();
