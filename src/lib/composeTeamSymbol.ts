import type { AnimalKey } from "./captainHelpers";
import { getTeamSymbolUrl } from "./teamSymbols";

/**
 * Compose a team logo with the team name baked into the ribbon.
 *
 * Why: rendering text on top of the logo via HTML+CSS introduces engine-specific
 * baseline / line-height differences between the browser (live page) and
 * html2canvas (share image). Baking the text directly onto the bitmap once
 * via Canvas API eliminates that. The result is a regular <img> that both
 * the browser and html2canvas just rasterize identically.
 *
 * Composition happens on the client, runs once per (animal, displayName)
 * combination, and is cached in memory.
 */

const NATIVE_SIZE = 1024;

/** Where the team name's vertical center sits on the source 1024×1024 PNGs. */
const RIBBON_CENTER_Y = NATIVE_SIZE * 0.76;

/** How much of the canvas width to keep clear on each side (ribbon's flat zone). */
const HORIZONTAL_PADDING_PCT = 0.15;

const TEXT_COLOR = "#0F172A";
const FONT_STACK = "'Rubik', 'Heebo', 'Inter', sans-serif";
const FONT_WEIGHT = 700;

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

interface ComposeArgs {
  animalKey: AnimalKey;
  displayName: string;
}

export function getCachedTeamSymbol(args: ComposeArgs): string | null {
  return cache.get(cacheKey(args)) ?? null;
}

export async function composeTeamSymbol(args: ComposeArgs): Promise<string> {
  const key = cacheKey(args);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = doCompose(args).then((url) => {
    cache.set(key, url);
    return url;
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

function cacheKey(args: ComposeArgs): string {
  return `${args.animalKey}|${args.displayName}`;
}

async function doCompose(args: ComposeArgs): Promise<string> {
  // Wait for custom fonts so the bake uses the same typeface as the rest of
  // the UI (Rubik / Heebo) instead of a fallback.
  if (typeof document !== "undefined" && document.fonts) {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }

  const img = await loadImage(getTeamSymbolUrl(args.animalKey));

  const canvas = document.createElement("canvas");
  canvas.width = NATIVE_SIZE;
  canvas.height = NATIVE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  // Draw the source logo at native resolution
  ctx.drawImage(img, 0, 0, NATIVE_SIZE, NATIVE_SIZE);

  // Compute a font size that fits horizontally
  const maxTextWidth = NATIVE_SIZE * (1 - 2 * HORIZONTAL_PADDING_PCT);
  const fontSize = fitFontSize(ctx, args.displayName, maxTextWidth);

  ctx.font = `${FONT_WEIGHT} ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    args.displayName,
    NATIVE_SIZE / 2,
    RIBBON_CENTER_Y,
    maxTextWidth,
  );

  // WebP at high quality keeps the file small and supports alpha.
  return canvas.toDataURL("image/webp", 0.92);
}

/** Largest font size (in source pixels) where the text still fits maxWidth. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): number {
  // Start tall, shrink in 4px steps until it fits.
  // Cap floor at 6% of native size so very long names stay readable-ish.
  const start = Math.round(NATIVE_SIZE * 0.13);
  const floor = Math.round(NATIVE_SIZE * 0.06);

  for (let size = start; size >= floor; size -= 4) {
    ctx.font = `${FONT_WEIGHT} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
  }
  return floor;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}
