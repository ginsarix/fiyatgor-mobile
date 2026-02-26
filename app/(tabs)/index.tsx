import { getProductByBarcode } from "@/services/api";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ModalScreen from "../server-code-modal";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function HomeScreen() {
  const successSoundRef = useRef<Audio.Sound | null>(null);
  const errorSoundRef = useRef<Audio.Sound | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState("");

  const [productLoading, setProductLoading] = useState(false);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");

  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  const [serverCodeModal, setServerCodeModal] = useState(false);
  const [serverCode, setServerCode] = useState("");

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
      await errorSoundRef.current.replayAsync();
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
          require("../../assets/sounds/success.mp3"),
        );

        const { sound: errorSound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/error.mp3"),
        );

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
      } catch {}
    }

    // Normal barkod veya düz QR metni ise -> aynen dön
    return s;
  };

  const inFlightRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);

  const COOLDOWN_MS = 1200;

  const onScan = async ({ data }: { data: string }) => {
    const code = getCodeFromScan(data); // senin fonksiyonun
    const now = Date.now();

    // Aynı barkod çok hızlı tekrar geldiyse yok say
    if (code === lastCodeRef.current && now - lastAtRef.current < COOLDOWN_MS) {
      return;
    }

    // Bir istek devam ediyorsa yenisini yok say
    if (inFlightRef.current) return;

    // Kilitle
    inFlightRef.current = true;
    lastCodeRef.current = code;
    lastAtRef.current = now;

    setBarcode(code);

    try {
      setProductLoading(true);
      const response = await getProductByBarcode(serverCode, code);

      if (!response?.product) {
        await playErrorSound();
        setProductName("");
        setPrice("");
        setCurrency("");
        return;
      }

      setProductName(response.product.name);
      setPrice(response.product.price);
      setCurrency(response.product.currency);
      await playSuccessSound();
    } catch {
      await playErrorSound();
    } finally {
      // Kısa bir süre sonra kilidi aç (kamera aynı barkodu hala görüyorsa tekrar yağmasın)
      setTimeout(() => {
        inFlightRef.current = false;
      }, COOLDOWN_MS);

      setProductLoading(false);
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
        <Text style={{ marginBottom: 12 }}>Kamera izni gerekli</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>İzin Ver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="never"
      keyboardDismissMode="interactive"
    >
      <View style={styles.page}>
        {/* ÜST */}
        <View style={styles.top}>
          <TextInput
            value={barcode}
            placeholder="Barkod"
            placeholderTextColor="gray"
            style={styles.input}
            editable={false}
          />

          {productLoading ? (
            <ActivityIndicator style={styles.loadingSpinner} size="large" />
          ) : (
            <>
              {productName && <Text style={styles.name}>{productName}</Text>}
              {price && (
                <Text style={styles.price}>
                  {`${Number(price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
                </Text>
              )}
            </>
          )}
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
                "upc_a",
                "upc_e",
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
            style={[styles.smallBtn, !isScanning && styles.smallBtnOff]}
            onPress={() => {
              setIsScanning((v) => !v);
              resetScan();
            }}
          >
            <Text style={styles.smallBtnText}>
              {isScanning ? "Taramayı Durdur" : "Taramayı Başlat"}
            </Text>
            <MaterialIcons
              name={isScanning ? "stop-circle" : "play-circle"}
              color="#fff"
              size={22}
            />
          </Pressable>

          <Pressable
            style={[styles.smallBtn, !torchOn && styles.smallBtnOff]}
            onPress={() => setTorchOn((v) => !v)}
          >
            <Text style={styles.smallBtnText}>
              {torchOn ? "Feneri Kapat" : "Feneri Aç"}
            </Text>
            <MaterialIcons
              name={torchOn ? "flashlight-off" : "flashlight-on"}
              color="#fff"
              size={22}
            />
          </Pressable>
        </View>
        <View style={styles.serverCodeModalTriggerContainer}>
          <Pressable
            style={styles.smallBtn}
            onPress={() => setServerCodeModal(true)}
          >
            <Text style={styles.smallBtnText}>Sunucu Kodunu Değiştir</Text>
          </Pressable>
        </View>
      </View>
      <ModalScreen
        serverCodeChanged={(serverCode) => setServerCode(serverCode)}
        isVisible={serverCodeModal}
        onClose={() => setServerCodeModal(false)}
      />
    </ScrollView>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
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
  serverCodeModalTriggerContainer: {
    paddingInline: 16,
  },
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
  loadingSpinner: { marginTop: 14 },
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
    flexDirection: "row",

    justifyContent: "space-around",
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
