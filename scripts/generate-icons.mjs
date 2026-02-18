import sharp from "sharp";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");

await mkdir(outDir, { recursive: true });

// Standard icon SVG — "DP" initials on emerald circle
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="#10b981"/>
  <text x="256" y="310" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="220" font-weight="800" fill="white" letter-spacing="-10">DP</text>
</svg>`;

// Maskable icon SVG — 20% safe-zone padding (smaller text, full background)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#10b981"/>
  <text x="256" y="315" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="180" font-weight="800" fill="white" letter-spacing="-8">DP</text>
</svg>`;

const sizes = [
  { name: "icon-192.png", size: 192, svg: standardSvg },
  { name: "icon-512.png", size: 512, svg: standardSvg },
  { name: "icon-maskable-192.png", size: 192, svg: maskableSvg },
  { name: "icon-maskable-512.png", size: 512, svg: maskableSvg },
  { name: "apple-touch-icon.png", size: 180, svg: standardSvg },
];

for (const { name, size, svg } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(outDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log("All icons generated successfully!");
