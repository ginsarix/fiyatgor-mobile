import { Camera, CameraDevice, CodeScanner } from "react-native-vision-camera";
import { StyleSheet, View } from "react-native";
import type { Bounds } from "@/hooks/use-barcode-scanner";

type Props = {
  device: CameraDevice;
  isActive: boolean;
  codeScanner: CodeScanner;
  torchOn: boolean;
  barcodeBounds: Bounds | null;
  onLayout: (width: number, height: number) => void;
};

export function ScannerCamera({
  device,
  isActive,
  codeScanner,
  torchOn,
  barcodeBounds,
  onLayout,
}: Props) {
  return (
    <View
      style={styles.cameraCard}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        onLayout(width, height);
      }}
    >
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={codeScanner}
        torch={torchOn ? "on" : "off"}
      />

      {barcodeBounds && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: barcodeBounds.origin.x,
            top: barcodeBounds.origin.y,
            width: barcodeBounds.size.width,
            height: barcodeBounds.size.height,
            borderWidth: 2,
            borderColor: "#facc15",
            borderRadius: 4,
            backgroundColor: "rgba(250, 204, 21, 0.15)",
          }}
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.frame}>
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </View>
      </View>
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const extra =
    pos === "tl"
      ? cornerStyles.tl
      : pos === "tr"
        ? cornerStyles.tr
        : pos === "bl"
          ? cornerStyles.bl
          : cornerStyles.br;
  return <View style={[cornerStyles.corner, extra]} />;
}

const CORNER = 34;
const THICK = 5;

const cornerStyles = StyleSheet.create({
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "white",
  },
  tl: { top: 0, left: 0, borderLeftWidth: THICK, borderTopWidth: THICK },
  tr: { top: 0, right: 0, borderRightWidth: THICK, borderTopWidth: THICK },
  bl: { bottom: 0, left: 0, borderLeftWidth: THICK, borderBottomWidth: THICK },
  br: { bottom: 0, right: 0, borderRightWidth: THICK, borderBottomWidth: THICK },
});

const styles = StyleSheet.create({
  cameraCard: {
    marginTop: 10,
    marginHorizontal: 16,
    height: 360,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: "86%",
    height: "72%",
  },
});
