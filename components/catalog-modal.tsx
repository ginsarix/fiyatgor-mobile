import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { API_URL } from "@/constants/api";
import { Modal, Pressable, View, Text, StyleSheet } from "react-native";
import { ThemeColors, useTheme } from "@/constants/theme";
import { useEffect, useMemo, useState } from "react";

const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1500;

export function CatalogModal({
  visible,
  onClose,
  serverCode,
}: {
  visible: boolean;
  onClose: () => void;
  serverCode: string;
}) {
  const t = useTheme();
  const catalogStyles = useMemo(() => makeCatalogStyles(t), [t]);

  const translateY = useSharedValue(800);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 50,
        stiffness: 300,
      });
    }
  }, [visible]);

  const dismissSheet = () => {
    onClose();
  };

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value =
        e.translationY < 0 ? e.translationY * 0.15 : e.translationY;
    })
    .onEnd((e) => {
      if (
        e.translationY > DISMISS_THRESHOLD ||
        e.velocityY > VELOCITY_THRESHOLD
      ) {
        translateY.value = withTiming(800, { duration: 280 }, (finished) => {
          if (finished) {
            runOnJS(dismissSheet)();
          }
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const [imageErrorOccurred, setImageErrorOccurred] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      supportedOrientations={["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"]}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={catalogStyles.overlay}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[catalogStyles.container, animatedStyle]}>
              <View style={catalogStyles.handleArea}>
                <View style={catalogStyles.handle} />
              </View>

              <View style={catalogStyles.header}>
                <View style={catalogStyles.headerSpacer} />
                <Text style={catalogStyles.title}>Katalog</Text>
                <Pressable style={catalogStyles.closeIconBtn} onPress={onClose}>
                  <Text style={catalogStyles.closeIconText}>✕</Text>
                </Pressable>
              </View>

              <View style={catalogStyles.imageWrapper}>
                {imageErrorOccurred && (
                  <Text style={catalogStyles.imageErrorText}>
                    Görsel bulunamadı, Firma henüz katalog eklememiş olabilir.
                  </Text>
                )}
                <Image
                  source={{ uri: `${API_URL}/servers/${serverCode}/catalog` }}
                  onLoad={() => setImageErrorOccurred(false)}
                  onError={() => setImageErrorOccurred(true)}
                  style={[
                    catalogStyles.image,
                    ...(imageErrorOccurred
                      ? [{ display: "none" } as const]
                      : []),
                  ]}
                  contentFit="contain"
                />
              </View>

              <View style={catalogStyles.footer}>
                <Pressable
                  style={catalogStyles.closeBtn}
                  onPress={() => {
                    translateY.value = withTiming(
                      800,
                      { duration: 280 },
                      (finished) => {
                        if (finished) runOnJS(onClose)();
                      },
                    );
                  }}
                >
                  <Text style={catalogStyles.closeBtnText}>Kapat</Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeCatalogStyles(t: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "flex-end",
      alignItems: "center",
    },
    container: {
      width: "100%",
      height: "88%",
      backgroundColor: t.catalogSheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: "hidden",
      paddingBottom: 32,
    },
    handleArea: {
      paddingVertical: 12,
      alignItems: "center",
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: t.catalogHandle,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.catalogHeaderBorder,
    },
    headerSpacer: {
      width: 36,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: t.catalogTitle,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    closeIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.catalogCloseIconBg,
      alignItems: "center",
      justifyContent: "center",
    },
    closeIconText: {
      color: t.catalogCloseIconText,
      fontSize: 18,
      lineHeight: 20,
      fontWeight: "300",
    },
    imageWrapper: {
      flex: 1,
      margin: 16,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: t.catalogImageWrapperBg,
      borderWidth: 1,
      borderColor: t.catalogImageWrapperBorder,
    },
    imageErrorText: {
      textAlign: "center",
      fontSize: 20,
      fontWeight: "500",
      color: t.catalogTitle,
      letterSpacing: 0.5,
    },
    image: {
      flex: 1,
      width: "100%",
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    closeBtn: {
      backgroundColor: t.catalogCloseBtnBg,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    closeBtnText: {
      color: t.catalogCloseBtnText,
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
}
