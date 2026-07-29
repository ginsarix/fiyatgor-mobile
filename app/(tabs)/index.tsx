import { useEffect, useMemo, useState } from "react";
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
import { useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemeColors, useTheme } from "@/constants/theme";
import { formatDiscountEndsAt, formatPrice } from "@/lib/format";
import { useSounds } from "@/hooks/use-sounds";
import { useProductLookup } from "@/hooks/use-product-lookup";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { ScannerCamera } from "@/components/scanner-camera";
import { FirmConnectionModal } from "@/components/firm-connection-modal";
import { CatalogModal } from "@/components/catalog-modal";
import { ScanHistory } from "@/components/scan-history";
import { OnboardingModal } from "@/components/onboarding";

export default function HomeScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeHomeStyles(t), [t]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");

  const [isScanning, setIsScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [discountDetailExpanded, setDiscountDetailExpanded] = useState(false);
  const [discountDetailTruncated, setDiscountDetailTruncated] = useState(false);

  const [serverCode, setServerCode] = useState("");
  const [firmCode, setFirmCode] = useState("");
  const [connectionMode, setConnectionMode] = useState<"firm" | "server">("server");

  const [firmConnectionModal, setFirmConnectionModal] = useState(false);
  const [catalogModal, setCatalogModal] = useState(false);
  const [onboardingModal, setOnboardingModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("onboarding-seen").then((val) => {
      if (!val) setOnboardingModal(true);
    });
  }, []);

  const { initiateSuccessUX, initiateErrorUX } = useSounds();

  const {
    barcode,
    setBarcode,
    productLoading,
    productName,
    price,
    currency,
    discountedPrice,
    discountActive,
    discountEndsAt,
    discountDetail,
    scanHistory,
    setScanHistory,
    onScan,
    demoScan,
  } = useProductLookup({
    serverCode,
    firmCode,
    connectionMode,
    initiateSuccessUX,
    initiateErrorUX,
  });

  const { codeScanner, barcodeBounds, onCameraLayout } = useBarcodeScanner(onScan);

  useEffect(() => {
    setDiscountDetailExpanded(false);
    setDiscountDetailTruncated(false);
  }, [discountDetail]);

  const handlePermission = async () => {
    if (await requestPermission()) return;
    Linking.openSettings();
  };

  if (!hasPermission) {
    return (
      <View style={[styles.center, styles.page]}>
        <Text style={{ marginBottom: 12, color: t.textPrimary }}>
          Kamera erişimi barkod taramak için gereklidir
        </Text>
        <Pressable style={styles.btn} onPress={handlePermission}>
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
        {/* Input + product result */}
        <View style={styles.top}>
          <View style={styles.inputRow}>
            <TextInput
              value={barcode}
              placeholder="Barkod"
              placeholderTextColor={t.inputPlaceholder}
              style={styles.input}
              onChangeText={setBarcode}
              onSubmitEditing={() => onScan({ data: barcode })}
            />
            <Pressable style={styles.helpBtn} onPress={() => setOnboardingModal(true)}>
              <MaterialIcons name="help-outline" size={22} color={t.textSecondary} />
            </Pressable>
          </View>

          {productLoading ? (
            <ActivityIndicator style={styles.loadingSpinner} size="large" />
          ) : (
            <>
              {productName !== undefined && (
                <Text style={styles.name}>{productName ?? "Ürün Bulunamadı"}</Text>
              )}

              {discountActive && discountedPrice && (
                <Pressable
                  style={styles.discountBadge}
                  onPress={() => {
                    if (discountDetailTruncated || discountDetailExpanded) {
                      setDiscountDetailExpanded((v) => !v);
                    }
                  }}
                  hitSlop={6}
                >
                  <MaterialIcons
                    name="local-offer"
                    size={13}
                    color={t.discountAccent}
                  />
                  <Text
                    style={styles.discountBadgeText}
                    numberOfLines={discountDetailExpanded ? undefined : 1}
                    ellipsizeMode="tail"
                    onTextLayout={(e) => {
                      if (!discountDetailExpanded) {
                        const line = e.nativeEvent.lines[0]?.text ?? "";
                        setDiscountDetailTruncated(line.includes("…"));
                      }
                    }}
                  >
                    {discountDetail ?? "İndirim"}
                  </Text>
                  {discountDetailTruncated && (
                    <MaterialIcons
                      name={discountDetailExpanded ? "expand-less" : "expand-more"}
                      size={15}
                      color={t.discountAccent}
                    />
                  )}
                </Pressable>
              )}

              {discountActive && discountedPrice && price && (
                <Text style={styles.originalPrice}>
                  {formatPrice(price, currency)}
                </Text>
              )}

              {price && (
                <Text
                  style={[
                    styles.price,
                    discountActive && discountedPrice && styles.priceDiscounted,
                  ]}
                >
                  {discountActive && discountedPrice
                    ? formatPrice(discountedPrice, currency)
                    : formatPrice(price, currency)}
                </Text>
              )}

              {discountActive && discountEndsAt && (
                <Text style={styles.discountEndsAt}>
                  {`İndirim bitişi: ${formatDiscountEndsAt(discountEndsAt)}`}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Camera */}
        {device && (
          <ScannerCamera
            device={device}
            isActive={isScanning}
            codeScanner={codeScanner}
            torchOn={torchOn}
            barcodeBounds={barcodeBounds}
            onLayout={onCameraLayout}
          />
        )}

        {/* Controls */}
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.smallBtn, !isScanning && styles.smallBtnOff]}
            onPress={() => setIsScanning((v) => !v)}
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
            <Text style={styles.smallBtnText}>{torchOn ? "Feneri Kapat" : "Feneri Aç"}</Text>
            <MaterialIcons
              name={torchOn ? "flashlight-off" : "flashlight-on"}
              color="#fff"
              size={22}
            />
          </Pressable>
        </View>

        <View style={styles.inlinePaddedContainer}>
          <Pressable style={styles.smallBtn} onPress={() => setFirmConnectionModal(true)}>
            <Text style={styles.smallBtnText}>Firma Bağlantısını Değiştir</Text>
          </Pressable>
        </View>
        <View style={styles.inlinePaddedContainer}>
          <Pressable style={styles.smallBtn} onPress={() => setCatalogModal(true)}>
            <Text style={styles.smallBtnText}>Kataloğu Aç</Text>
          </Pressable>
        </View>
        <View style={styles.inlinePaddedContainer}>
          <Pressable style={styles.smallBtn} onPress={demoScan}>
            <Text style={styles.smallBtnText}>Demo Barkod Dene</Text>
          </Pressable>
        </View>

        {scanHistory.length > 0 && (
          <ScanHistory
            onChange={setScanHistory}
            scanHistory={scanHistory}
            homeStyles={styles}
          />
        )}
      </View>

      <FirmConnectionModal
        serverCodeChanged={setServerCode}
        firmCodeChanged={setFirmCode}
        connectionModeChanged={setConnectionMode}
        isVisible={firmConnectionModal}
        onClose={() => setFirmConnectionModal(false)}
      />

      <CatalogModal
        visible={catalogModal}
        onClose={() => setCatalogModal(false)}
        serverCode={serverCode}
      />

      <OnboardingModal
        visible={onboardingModal}
        onClose={() => {
          setOnboardingModal(false);
          AsyncStorage.setItem("onboarding-seen", "1");
        }}
      />
    </ScrollView>
  );
}

function makeHomeStyles(t: ThemeColors) {
  return StyleSheet.create({
    inlinePaddedContainer: {
      paddingInline: 16,
      marginBottom: 10,
    },
    page: {
      flex: 1,
      backgroundColor: t.pageBg,
      paddingTop: 30,
    },
    top: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: t.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: t.inputBorder,
      fontSize: 16,
      color: t.inputText,
    },
    helpBtn: {
      padding: 6,
    },
    loadingSpinner: { marginTop: 14 },
    name: {
      marginTop: 14,
      fontSize: 26,
      fontWeight: "800",
      color: t.textPrimary,
    },
    price: {
      marginTop: 10,
      fontSize: 40,
      fontWeight: "900",
      color: t.textPrimary,
    },
    priceDiscounted: {
      color: t.discountAccent,
    },
    discountBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      maxWidth: "90%",
      gap: 4,
      marginTop: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.discountBadgeBorder,
      backgroundColor: t.discountBadgeBg,
    },
    discountBadgeText: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: "700",
      color: t.discountAccent,
    },
    originalPrice: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: "600",
      color: t.originalPriceText,
      textDecorationLine: "line-through",
    },
    discountEndsAt: {
      marginTop: 4,
      fontSize: 12,
      color: t.textSecondary,
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
      backgroundColor: t.btnBg,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    smallBtnOff: {
      backgroundColor: t.btnBgOff,
    },
    smallBtnText: {
      color: t.btnText,
      fontWeight: "800",
    },
    tinyBtn: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: t.btnBg,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: "center",
    },
    tinyBtnText: {
      color: t.btnText,
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
      backgroundColor: t.btnBg,
      borderRadius: 10,
    },
    btnText: {
      color: t.btnText,
      fontWeight: "700",
    },
  });
}
