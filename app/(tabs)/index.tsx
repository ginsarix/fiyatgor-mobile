import { getProductByBarcode } from "@/services/api";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ModalScreen from "../server-code-modal";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type ScanEntry = {
  id: number;
  barcode: string;
  productName: string | null;
  price: string | null;
  currency: string | null;
  demo?: boolean;
};

export default function HomeScreen() {
  const successSoundRef = useRef<Audio.Sound | null>(null);
  const errorSoundRef = useRef<Audio.Sound | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [barcode, setBarcode] = useState("");

  const [productLoading, setProductLoading] = useState(false);
  const [productName, setProductName] = useState<string | null>();
  const [price, setPrice] = useState<string | null>();
  const [currency, setCurrency] = useState<string | null>();

  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const nextIdRef = useRef(0);
  const cameraCardSizeRef = useRef({ width: 0, height: 0 });

  type Bounds = {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  };
  const [barcodeBounds, setBarcodeBounds] = useState<Bounds | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!permission) return;

    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

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

  const isBarcodeInFrame = (bounds: {
    origin: { x: number; y: number };
    size: { width: number; height: number };
  }) => {
    const { width, height } = cameraCardSizeRef.current;
    if (!width || !height) return true;

    const frameX = width * 0.07;
    const frameY = height * 0.14;
    const frameW = width * 0.86;
    const frameH = height * 0.72;

    const cx = bounds.origin.x + bounds.size.width / 2;
    const cy = bounds.origin.y + bounds.size.height / 2;

    return (
      cx >= frameX &&
      cx <= frameX + frameW &&
      cy >= frameY &&
      cy <= frameY + frameH
    );
  };

  const inFlightRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);

  const COOLDOWN_MS = 1200;

  const appendHistory = (scan: Omit<ScanEntry, "id">) => {
    setScanHistory((prev) => [{ ...scan, id: nextIdRef.current++ }, ...prev]);
  };

  const demoScan = async () => {
    setBarcode("5555555555555");
    await playSuccessSound();
    setProductName("İnşaat Demiri (8mm)");
    setPrice("12000");
    setCurrency("TL");
    appendHistory({
      barcode: "5555555555555",
      productName: "İnşaat Demiri (8mm)",
      price: "12000",
      currency: "TL",
      demo: true,
    });
  };

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
        setProductName(null);
        setPrice(null);
        setCurrency(null);
        appendHistory({
          barcode: code,
          productName: null,
          price: null,
          currency: null,
        });
        return;
      }

      setProductName(response.product.name);
      setPrice(response.product.price);
      setCurrency(response.product.currency);
      appendHistory({
        barcode: code,
        productName: response.product.name,
        price: response.product.price,
        currency: response.product.currency,
      });
      await playSuccessSound();
    } catch {
      appendHistory({
        barcode: code,
        productName: null,
        price: null,
        currency: null,
      });
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
    return null;
  }

  const handlePermission = async () => {
    if (!permission) return;

    if (permission.canAskAgain) {
      await requestPermission();
    } else {
      Linking.openSettings();
    }
  };

  if (!permission.granted) {
    return (
      <View style={[styles.center, styles.page]}>
        <Text style={{ marginBottom: 12 }}>
          Kamera erişimi barkod taramak için gereklidir
        </Text>

        <Pressable style={styles.btn} onPress={() => handlePermission()}>
          <Text style={styles.btnText}>Devam Et</Text>
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
            onChangeText={(t) => setBarcode(t)}
            onSubmitEditing={() => onScan({ data: barcode })}
          />

          {productLoading ? (
            <ActivityIndicator style={styles.loadingSpinner} size="large" />
          ) : (
            <>
              {productName !== undefined && (
                <Text style={styles.name}>
                  {productName ?? "Ürün Bulunamadı"}
                </Text>
              )}
              {price && (
                <Text style={styles.price}>
                  {`${Number(price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
                </Text>
              )}
            </>
          )}
        </View>

        {/* KAMERA */}
        <View
          style={styles.cameraCard}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            cameraCardSizeRef.current = { width, height };
          }}
        >
          {isScanning && (
            <CameraView
              key={cameraKey}
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={(result) => {
                if (!isBarcodeInFrame(result.bounds)) {
                  // Barcode outside frame — clear highlight if shown
                  if (barcodeBounds !== null) setBarcodeBounds(null);
                  return;
                }

                // Update highlight on every frame
                setBarcodeBounds(result.bounds);
                if (boundsTimerRef.current)
                  clearTimeout(boundsTimerRef.current);
                boundsTimerRef.current = setTimeout(
                  () => setBarcodeBounds(null),
                  400,
                );

                onScan(result);
              }}
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
          )}

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
        <View style={styles.inlinePaddedContainer}>
          <Pressable
            style={styles.smallBtn}
            onPress={() => setServerCodeModal(true)}
          >
            <Text style={styles.smallBtnText}>Sunucu Kodunu Değiştir</Text>
          </Pressable>
        </View>
        <View style={styles.inlinePaddedContainer}>
          <Pressable style={styles.smallBtn} onPress={() => demoScan()}>
            <Text style={styles.smallBtnText}>Demo Barkod Dene</Text>
          </Pressable>
        </View>

        {scanHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historySectionTitle}>
              <Text style={styles.historyTitle}>Taranan Barkodlar</Text>
              <Pressable
                style={styles.tinyBtn}
                onPress={() => setScanHistory([])}
              >
                <Text style={styles.tinyBtnText}>Temizle</Text>
                <MaterialIcons
                  name="delete-sweep"
                  color={"#9ca3af"}
                  size={14}
                  style={{ marginLeft: 6 }}
                />
              </Pressable>
            </View>
            {scanHistory.map((entry) => (
              <ScanHistoryItem key={entry.id} entry={entry} />
            ))}
          </View>
        )}
      </View>
      <ModalScreen
        serverCodeChanged={(serverCode) => setServerCode(serverCode)}
        isVisible={serverCodeModal}
        onClose={() => setServerCodeModal(false)}
      />
    </ScrollView>
  );
}

function ScanHistoryItem({ entry }: { entry: ScanEntry }) {
  const [open, setOpen] = useState(false);
  const found = entry.productName !== null;

  return (
    <View style={historyStyles.card}>
      <Pressable
        style={historyStyles.header}
        onPress={() => setOpen((v) => !v)}
      >
        <MaterialIcons
          name={open ? "keyboard-arrow-down" : "keyboard-arrow-right"}
          size={20}
          color="#555"
        />
        <Text style={historyStyles.barcode} numberOfLines={1}>
          {entry.barcode}
        </Text>
        <View
          style={[
            historyStyles.badge,
            found ? historyStyles.badgeFound : historyStyles.badgeNotFound,
          ]}
        >
          <Text style={historyStyles.badgeText}>
            {found ? (!entry.demo ? "Bulundu" : "Demo") : "Bulunamadı"}
          </Text>
        </View>
      </Pressable>

      {open && (
        <View style={historyStyles.body}>
          {found ? (
            <>
              <Text style={historyStyles.bodyName}>{entry.productName}</Text>
              <Text style={historyStyles.bodyPrice}>
                {`${Number(entry.price).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${entry.currency}`}
              </Text>
            </>
          ) : (
            <Text style={historyStyles.bodyNotFound}>Ürün bulunamadı</Text>
          )}
        </View>
      )}
    </View>
  );
}

const historyStyles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e3ec",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  barcode: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeFound: {
    backgroundColor: "#e6f4ea",
  },
  badgeNotFound: {
    backgroundColor: "#fce8e6",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#444",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  bodyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  bodyPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111",
  },
  bodyNotFound: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
  },
});

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
  inlinePaddedContainer: {
    paddingInline: 16,
    marginBottom: 10,
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
  tinyBtn: {
    flexDirection: "row",

    justifyContent: "space-around",
    backgroundColor: "#111",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  tinyBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
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
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginTop: 16,
  },
  historySectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
