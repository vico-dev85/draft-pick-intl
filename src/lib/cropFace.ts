/**
 * Pure utility: crops a face from a positioned/scaled image using an oval clip.
 * Returns a PNG File with transparent background outside the oval.
 */

export interface CropParams {
  /** The loaded source image */
  img: HTMLImageElement;
  /** Display container dimensions (px) */
  containerWidth: number;
  containerHeight: number;
  /** Pan offset from centered position (px) */
  offsetX: number;
  offsetY: number;
  /** Zoom scale factor (1 = fit) */
  scale: number;
  /** Oval center Y as ratio of container height (e.g. 0.42) */
  ovalCenterYRatio: number;
  /** Oval half-width as ratio of container width (e.g. 0.35) */
  ovalRxRatio: number;
  /** Oval height/width ratio (e.g. 1.35 for taller-than-wide) */
  ovalAspect: number;
  /** Output image width in pixels */
  outputWidth: number;
}

export async function cropFaceToFile(params: CropParams): Promise<File> {
  const {
    img,
    containerWidth,
    containerHeight,
    offsetX,
    offsetY,
    scale,
    ovalCenterYRatio,
    ovalRxRatio,
    ovalAspect,
    outputWidth,
  } = params;

  const outputHeight = Math.round(outputWidth * ovalAspect);

  // Oval dimensions in display coordinates
  const ovalRx = containerWidth * ovalRxRatio;
  const ovalRy = ovalRx * ovalAspect;
  const ovalCx = containerWidth / 2;
  const ovalCy = containerHeight * ovalCenterYRatio;

  // The image is displayed centered in the container, then offset and scaled.
  // "Centered" means the image center aligns with the container center.
  // The fit scale makes the image fill the container width.
  const fitScale = containerWidth / img.naturalWidth;
  const totalScale = fitScale * scale;

  // Display-space position of image center:
  const imgDisplayCx = containerWidth / 2 + offsetX;
  const imgDisplayCy = containerHeight / 2 + offsetY;

  // Map oval bounding box corners from display space to source image space
  const srcCx = (ovalCx - imgDisplayCx) / totalScale + img.naturalWidth / 2;
  const srcCy = (ovalCy - imgDisplayCy) / totalScale + img.naturalHeight / 2;
  const srcRx = ovalRx / totalScale;
  const srcRy = ovalRy / totalScale;

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  // Clear to transparent
  ctx.clearRect(0, 0, outputWidth, outputHeight);

  // Clip to ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    outputWidth / 2,
    outputHeight / 2,
    outputWidth / 2,
    outputHeight / 2,
    0,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.clip();

  // Draw the source region into the canvas
  ctx.drawImage(
    img,
    srcCx - srcRx,
    srcCy - srcRy,
    srcRx * 2,
    srcRy * 2,
    0,
    0,
    outputWidth,
    outputHeight
  );

  ctx.restore();

  // Export as PNG blob
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(new File([blob], `face-${Date.now()}.png`, { type: "image/png" }));
      },
      "image/png"
    );
  });
}
