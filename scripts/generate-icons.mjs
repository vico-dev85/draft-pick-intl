import sharp from "sharp";
import { mkdir, copyFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const outDir = join(publicDir, "icons");
const sourceIcon = join(publicDir, "512.png");

await mkdir(outDir, { recursive: true });

// Generate standard icons from 512.png source
const standardSizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of standardSizes) {
  await sharp(sourceIcon)
    .resize(size, size)
    .png()
    .toFile(join(outDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

// Generate maskable icons (20% safe-zone padding — add purple background fill)
const maskableSizes = [
  { name: "icon-maskable-192.png", size: 192 },
  { name: "icon-maskable-512.png", size: 512 },
];

for (const { name, size } of maskableSizes) {
  // Inner icon is 80% of total size (20% padding = 10% each side)
  const innerSize = Math.round(size * 0.8);
  const offset = Math.round(size * 0.1);

  const resizedIcon = await sharp(sourceIcon)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 124, g: 58, b: 237, alpha: 1 }, // #7C3AED
    },
  })
    .composite([{ input: resizedIcon, top: offset, left: offset }])
    .png()
    .toFile(join(outDir, name));

  console.log(`Generated ${name} (${size}x${size}, maskable)`);
}

// Generate favicons
const faviconSizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
];

for (const { name, size } of faviconSizes) {
  await sharp(sourceIcon)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

// Generate favicon.ico (32x32 PNG renamed — browsers accept PNG favicons)
await sharp(sourceIcon)
  .resize(32, 32)
  .png()
  .toFile(join(publicDir, "favicon.ico"));
console.log("Generated favicon.ico (32x32)");

console.log("\nAll icons generated successfully!");
