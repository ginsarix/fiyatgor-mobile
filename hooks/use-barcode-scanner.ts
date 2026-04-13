import { Platform } from "react-native";
import { useCodeScanner } from "react-native-vision-camera";
import { useRef, useState } from "react";

export type Bounds = {
  origin: { x: number; y: number };
  size: { width: number; height: number };
};

export function useBarcodeScanner(onScan: (args: { data: string }) => void) {
  const cameraCardSizeRef = useRef({ width: 0, height: 0 });
  const [barcodeBounds, setBarcodeBounds] = useState<Bounds | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeBoundsRef = useRef<Bounds | null>(null);

  // Always call the latest onScan without re-creating the scanner.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const isBarcodeInFrame = (bounds: Bounds) => {
    const { width, height } = cameraCardSizeRef.current;
    if (!width || !height) return true;
    const frameX = width * 0.07;
    const frameY = height * 0.14;
    const frameW = width * 0.86;
    const frameH = height * 0.72;
    const cx = bounds.origin.x + bounds.size.width / 2;
    const cy = bounds.origin.y + bounds.size.height / 2;
    return cx >= frameX && cx <= frameX + frameW && cy >= frameY && cy <= frameY + frameH;
  };

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13", "ean-8", "upc-a", "upc-e"],
    onCodeScanned: (codes, frame) => {
      if (codes.length === 0) return;
      const code = codes[0];
      if (!code.value) return;

      if (code.frame) {
        const { width: vw, height: vh } = cameraCardSizeRef.current;
        const fw = frame.width;
        const fh = frame.height;

        let normalized: Bounds;
        if (fw > fh) {
          if (Platform.OS === "ios") {
            // iOS (AVFoundation): code.frame is in raw landscape sensor space → 90° CW rotation + cover scale.
            const scale = vw / fh;
            const yOffset = (fw * scale - vh) / 2;
            normalized = {
              origin: {
                x: (fh - code.frame.y - code.frame.height) * scale,
                y: code.frame.x * scale - yOffset,
              },
              size: {
                width: code.frame.height * scale,
                height: code.frame.width * scale,
              },
            };
          } else {
            // Android (ML Kit): code.frame is already portrait/display-oriented.
            // Swap fw/fh to get the effective portrait frame dimensions, then cover scale.
            const pfW = fh;
            const pfH = fw;
            const scale = vw / pfW;
            const yOffset = (pfH * scale - vh) / 2;
            normalized = {
              origin: {
                x: code.frame.x * scale,
                y: code.frame.y * scale - yOffset,
              },
              size: {
                width: code.frame.width * scale,
                height: code.frame.height * scale,
              },
            };
          }
        } else {
          // Portrait sensor frame: cover scale + x crop offset.
          const scale = vh / fh;
          const xOffset = (fw * scale - vw) / 2;
          normalized = {
            origin: {
              x: code.frame.x * scale - xOffset,
              y: code.frame.y * scale,
            },
            size: {
              width: code.frame.width * scale,
              height: code.frame.height * scale,
            },
          };
        }

        if (isBarcodeInFrame(normalized)) {
          barcodeBoundsRef.current = normalized;
          setBarcodeBounds(normalized);
          if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
          boundsTimerRef.current = setTimeout(() => {
            barcodeBoundsRef.current = null;
            setBarcodeBounds(null);
          }, 400);
        } else {
          if (barcodeBoundsRef.current !== null) {
            barcodeBoundsRef.current = null;
            setBarcodeBounds(null);
          }
        }
      }

      onScanRef.current({ data: code.value });
    },
  });

  const onCameraLayout = (width: number, height: number) => {
    cameraCardSizeRef.current = { width, height };
  };

  return { codeScanner, barcodeBounds, onCameraLayout };
}
