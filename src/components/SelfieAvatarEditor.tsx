import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, ZoomOut, ZoomIn, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cropFaceToFile } from "@/lib/cropFace";

// Oval positioning constants
const OVAL_CENTER_Y_RATIO = 0.42; // 42% from top
const OVAL_RX_RATIO = 0.35; // half-width = 35% of container width
const OVAL_ASPECT = 1.35; // height = 1.35 × width
const OUTPUT_WIDTH = 280; // output image width in px

interface SelfieAvatarEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (croppedFile: File) => void;
}

type Step = "pick" | "position";

export function SelfieAvatarEditor({
  open,
  onOpenChange,
  onComplete,
}: SelfieAvatarEditorProps) {
  const [step, setStep] = useState<Step>("pick");
  const [isCropping, setIsCropping] = useState(false);

  // Image state
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  // Position state
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);

  // Container ref for dimensions
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    pointerId: number;
  } | null>(null);

  // Pinch state
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
  } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Hidden file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setStep("pick");
      setImgSrc(null);
      imgRef.current = null;
      setOffsetX(0);
      setOffsetY(0);
      setScale(1);
      setIsCropping(false);
    }
  }, [open]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selection

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSrc(url);
      setOffsetX(0);
      setOffsetY(0);
      setScale(1);
      setStep("position");
    };
    img.src = url;
  }, []);

  const handleCrop = useCallback(async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    setIsCropping(true);
    try {
      const file = await cropFaceToFile({
        img,
        containerWidth: container.offsetWidth,
        containerHeight: container.offsetHeight,
        offsetX,
        offsetY,
        scale,
        ovalCenterYRatio: OVAL_CENTER_Y_RATIO,
        ovalRxRatio: OVAL_RX_RATIO,
        ovalAspect: OVAL_ASPECT,
        outputWidth: OUTPUT_WIDTH,
      });
      onComplete(file);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setIsCropping(false);
    }
  }, [offsetX, offsetY, scale, onComplete]);

  // Pointer handlers for drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        // Start pinch
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchRef.current = { startDist: dist, startScale: scale };
        dragRef.current = null;
        return;
      }

      if (pointersRef.current.size === 1) {
        dragRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
          startOffsetX: offsetX,
          startOffsetY: offsetY,
          pointerId: e.pointerId,
        };
      }
    },
    [offsetX, offsetY, scale]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Pinch zoom
      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const newScale = Math.max(
          0.5,
          Math.min(3, pinchRef.current.startScale * (dist / pinchRef.current.startDist))
        );
        setScale(newScale);
        return;
      }

      // Drag
      if (dragRef.current?.active && e.pointerId === dragRef.current.pointerId) {
        setOffsetX(dragRef.current.startOffsetX + (e.clientX - dragRef.current.startX));
        setOffsetY(dragRef.current.startOffsetY + (e.clientY - dragRef.current.startY));
      }
    },
    []
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
  }, []);

  const handleZoomChange = useCallback((value: number[]) => {
    setScale(value[0] / 100);
  }, []);

  // SVG overlay dimensions
  const renderSvgOverlay = (w: number, h: number) => {
    const cx = w / 2;
    const cy = h * OVAL_CENTER_Y_RATIO;
    const rx = w * OVAL_RX_RATIO;
    const ry = rx * OVAL_ASPECT;

    return (
      <svg
        className="absolute inset-0 z-20 pointer-events-none"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="ovalMask">
            <rect width={w} height={h} fill="white" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </mask>
        </defs>
        {/* Dark overlay with oval hole */}
        <rect
          width={w}
          height={h}
          fill="rgba(0,0,0,0.65)"
          mask="url(#ovalMask)"
        />
        {/* Dashed oval guide */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity="0.5"
        />
      </svg>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-emerald-900 border-white/10 max-h-[92vh]">
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {step === "pick" && (
          <>
            <DrawerHeader className="text-center" dir="rtl">
              <DrawerTitle className="text-white text-lg">
                צלם תמונה לפרופיל
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-6 space-y-4 flex flex-col items-center" dir="rtl">
              <div className="text-6xl opacity-30 mb-2">🤳</div>

              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full max-w-xs h-14 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-3"
              >
                <Camera className="h-5 w-5" />
                צלם סלפי
              </Button>

              <Button
                variant="outline"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full max-w-xs h-12 text-sm bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white gap-3"
              >
                <ImageIcon className="h-4 w-4" />
                בחר מהגלריה
              </Button>

              <p className="text-white/40 text-xs text-center">
                תמונת פנים מקדימה עובדת הכי טוב
              </p>
            </div>
          </>
        )}

        {step === "position" && imgSrc && (
          <>
            <DrawerHeader className="text-center pb-2" dir="rtl">
              <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => {
                    setStep("pick");
                    setImgSrc(null);
                  }}
                  className="text-white/50 hover:text-white p-1"
                >
                  <X className="h-5 w-5" />
                </button>
                <DrawerTitle className="text-white text-base">
                  מקם את הפנים
                </DrawerTitle>
                <div className="w-7" /> {/* spacer */}
              </div>
            </DrawerHeader>

            <div className="px-4 pb-4 space-y-3" dir="rtl">
              {/* Editor area */}
              <div
                ref={containerRef}
                data-vaul-no-drag
                className="relative w-full bg-black rounded-2xl overflow-hidden border border-white/10 cursor-grab active:cursor-grabbing"
                style={{ height: "min(400px, 55vh)", touchAction: "none" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Photo */}
                <img
                  src={imgSrc}
                  alt=""
                  className="absolute z-10 pointer-events-none"
                  style={{
                    width: "100%",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
                    transformOrigin: "center center",
                  }}
                  draggable={false}
                />

                {/* SVG overlay - rendered with fixed dimensions, CSS fills container */}
                {containerRef.current
                  ? renderSvgOverlay(
                      containerRef.current.offsetWidth,
                      containerRef.current.offsetHeight
                    )
                  : renderSvgOverlay(340, 400)}
              </div>

              {/* Zoom slider */}
              <div className="flex items-center gap-3 px-2">
                <ZoomOut className="h-4 w-4 text-white/40 flex-shrink-0" />
                <Slider
                  min={50}
                  max={300}
                  step={1}
                  value={[Math.round(scale * 100)]}
                  onValueChange={handleZoomChange}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-white/40 flex-shrink-0" />
              </div>

              {/* Confirm button */}
              <Button
                onClick={handleCrop}
                disabled={isCropping}
                className="w-full h-12 text-base font-bold bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {isCropping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    אישור
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
