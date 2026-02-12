import { getProductByBarcode } from "@/services/api";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomeScreen() {
  const successSoundRef = useRef<Audio.Sound | null>(null);
  const errorSoundRef = useRef<Audio.Sound | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState("");
  const [productName, setProductName] = useState("");
  const [priceText, setPriceText] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  // Kamera resetlemek için key (Tekrar Tara garantisi)
  const [cameraKey, setCameraKey] = useState(0);

  const playSuccessSound = async () => {
    try {
      if (!successSoundRef.current) return;
      await successSoundRef.current.replayAsync();
    } catch (e) {
      console.log("Success sound error:", e);
    }
  };

    const playErrorSound = async () => {
    try {
      if (!errorSoundRef.current) return;
      await errorSoundRef.current.playAsync();
    } catch (e) {
      console.log("Error sound error:", e);
    }
  };

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted]);

  const resetScan = () => {
    setCameraKey((k) => k + 1);
  };

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });

        const { sound: successSound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/success.mp3")
        );

        const { sound: errorSound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/error.mp3")
        )

        successSoundRef.current = successSound;
        errorSoundRef.current = errorSound;
      } catch (e) {
        console.log("Audio init error:", e);
      }
    })();

    return () => {
      successSoundRef.current?.unloadAsync();
      errorSoundRef.current?.unloadAsync();
    };
  }, []);
  const getCodeFromScan = (raw: string) => {
    const s = (raw || "").trim();

    // QR bir linkse -> son parçayı kod olarak al
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const last = s.split("/").filter(Boolean).pop();
      return (last || s).trim();
    }

    // QR JSON ise -> barcode/code alanını al
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        const obj = JSON.parse(s);
        const code = obj?.barcode || obj?.code || obj?.data;
        if (typeof code === "string") return code.trim();
      } catch { }
    }

    // Normal barkod veya düz QR metni ise -> aynen dön
    return s;
  };


  const onScan = async ({ data }: { data: string }) => {
    if (!isScanning) return;

    setBarcode(data);

    const product = await getProductByBarcode(data);

    if (!product) {
      await playErrorSound();
    }

    if (product) {
      setProductName(product.name);
      setPriceText(product.price);
      await playSuccessSound();
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>İzin kontrol ediliyor…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>
          Kamera izni gerekli
        </Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* ÜST */}
      <View style={styles.top}>
        <TextInput
          value={barcode}
          placeholder="Barkod"
          style={styles.input}
          editable={false}
        />
        <Text style={styles.name}>
          {productName || "Ürün adı"}
        </Text>
        <Text style={styles.price}>
          {priceText || "0,00 TL"}
        </Text>
      </View>

      {/* KAMERA */}
      <View style={styles.cameraCard}>
        <CameraView
          key={cameraKey}
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={isScanning ? onScan : undefined}
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "ean13",
              "ean8",
              "code128",
              "code39",
              "upc_a",
              "upc_e",
              "pdf417",
              "aztec",
              "datamatrix",
            ],
          }}
          enableTorch={torchOn}
        />

        <View style={styles.overlay}>
          <View style={styles.frame}>
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
        </View>
      </View>

      {/* ALT */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[
            styles.smallBtn,
            !isScanning && styles.smallBtnOff,
          ]}
          onPress={() => {
            setIsScanning((v) => !v);
            resetScan();
          }}
        >
          <Text style={styles.smallBtnText}>
            {isScanning
              ? "Taramayı Durdur"
              : "Taramayı Başlat"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.smallBtn,
            !torchOn && styles.smallBtnOff,
          ]}
          onPress={() =>
            setTorchOn((v) => !v)
          }
        >
          <Text style={styles.smallBtnText}>
            {torchOn
              ? "Feneri Kapat"
              : "Feneri Aç"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Corner({
  pos,
}: {
  pos: "tl" | "tr" | "bl" | "br";
}) {
  const extra =
    pos === "tl"
      ? styles.tl
      : pos === "tr"
        ? styles.tr
        : pos === "bl"
          ? styles.bl
          : styles.br;

  return <View style={[styles.corner, extra]} />;
}

const CORNER = 34;
const THICK = 5;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f2f3f7",
    paddingTop: 30,
  },
  top: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#d7dbe6",
    fontSize: 16,
  },
  name: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: "800",
    color: "#222",
  },
  price: {
    marginTop: 10,
    fontSize: 40,
    fontWeight: "900",
    color: "#222",
  },
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
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "white",
  },
  tl: {
    top: 0,
    left: 0,
    borderLeftWidth: THICK,
    borderTopWidth: THICK,
  },
  tr: {
    top: 0,
    right: 0,
    borderRightWidth: THICK,
    borderTopWidth: THICK,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderLeftWidth: THICK,
    borderBottomWidth: THICK,
  },
  br: {
    bottom: 0,
    right: 0,
    borderRightWidth: THICK,
    borderBottomWidth: THICK,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smallBtnOff: {
    backgroundColor: "#2b2b2b",
  },
  smallBtnText: {
    color: "white",
    fontWeight: "800",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: "black",
    borderRadius: 10,
  },
  btnText: {
    color: "white",
    fontWeight: "700",
  },
});
