import { useEffect, useMemo } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ThemeColors, useTheme } from "@/constants/theme";

const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 1500;
const PURCHASE_URL = "https://panuteknoloji.com.tr/panunet-fiyat-gor";

type Section = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  body: string;
  accent?: string;
};

const SECTIONS: Section[] = [
  {
    icon: "qr-code-scanner",
    title: "Barkod Tarama",
    body: "Kamerayı ürün barkoduna tutun. Barkod çerçeve içine girdiğinde fiyat otomatik olarak sorgulanır ve ekranda görüntülenir. Barkodu elle de girebilirsiniz.",
  },
  {
    icon: "vpn-key",
    title: "Sunucu Kodu",
    body: 'Sunucu kodu, hangi firmanın ürün veri tabanına erişeceğinizi belirler. Her firmanın kendine ait bir kodu vardır.\n\nUygulama varsayılan olarak demo kodu ile açılır; demo ürünlerini hemen deneyebilirsiniz.\n\nKodunuzu değiştirmek için "Sunucu Kodunu Değiştir" butonunu kullanın.',
  },
  {
    icon: "menu-book",
    title: "Katalog",
    body: 'Firmalar, ürün kataloglarını PanuNet yönetim paneli üzerinden istedikleri zaman güncelleyebilir.\n\n"Kataloğu Aç" butonuyla girdiğiniz sunucu koduna ait firmanın güncel ürün kataloğunu görüntüleyebilirsiniz.',
  },
  {
    icon: "store",
    title: "Kendi Sunucu Kodunuzu Alın",
    body: "Firmanıza özel sunucu kodu edinmek, ürün veri tabanınızı yönetmek ve katalog özelliğini kullanmak için PanuNet FiyatGör hizmetini inceleyebilirsiniz.",
    accent: PURCHASE_URL,
  },
];

export function OnboardingModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const translateY = useSharedValue(900);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 50, stiffness: 300 });
    }
  }, [visible]);

  const dismiss = () => onClose();

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value =
        e.translationY < 0 ? e.translationY * 0.1 : e.translationY;
    })
    .onEnd((e) => {
      if (
        e.translationY > DISMISS_THRESHOLD ||
        e.velocityY > VELOCITY_THRESHOLD
      ) {
        translateY.value = withTiming(900, { duration: 280 }, (done) => {
          if (done) runOnJS(dismiss)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    translateY.value = withTiming(900, { duration: 280 }, (done) => {
      if (done) runOnJS(dismiss)();
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.overlay}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[s.sheet, animatedStyle]}>
              {/* Handle */}
              <View style={s.handleArea}>
                <View style={s.handle} />
              </View>

              {/* Header */}
              <View style={s.header}>
                <View style={s.headerSpacer} />
                <Text style={s.headerTitle}>Nasıl Kullanılır?</Text>
                <Pressable style={s.closeIconBtn} onPress={handleClose}>
                  <Text style={s.closeIconText}>✕</Text>
                </Pressable>
              </View>

              {/* Scrollable content */}
              <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Hero */}
                <View style={s.hero}>
                  <View style={s.heroIconWrap}>
                    <MaterialIcons
                      name="barcode-reader"
                      size={48}
                      color={t.btnText}
                    />
                  </View>
                  <Text style={s.heroTitle}>FiyatGör</Text>
                  <Text style={s.heroSub}>
                    Barkod okuyarak ürün fiyatlarını anında öğrenin. Mağaza
                    personeli ve kendi sunucu koduna sahip herkes kullanabilir.
                  </Text>
                </View>

                {/* Sections */}
                {SECTIONS.map((sec) => (
                  <View key={sec.title} style={s.card}>
                    <View style={s.cardIcon}>
                      <MaterialIcons
                        name={sec.icon}
                        size={22}
                        color={t.btnText}
                      />
                    </View>
                    <View style={s.cardBody}>
                      <Text style={s.cardTitle}>{sec.title}</Text>
                      <Text style={s.cardText}>{sec.body}</Text>
                      {sec.accent && (
                        <Pressable
                          onPress={() => Linking.openURL(sec.accent!)}
                          style={s.linkBtn}
                        >
                          <MaterialIcons
                            name="open-in-new"
                            size={14}
                            color={t.btnText}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={s.linkText}>panuteknoloji.com.tr</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Footer */}
              <View style={s.footer}>
                <Pressable style={s.closeBtn} onPress={handleClose}>
                  <Text style={s.closeBtnText}>Anladım</Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      width: "100%",
      height: "88%",
      backgroundColor: t.pageBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 32,
    },
    handleArea: {
      paddingTop: 12,
      paddingBottom: 4,
      alignItems: "center",
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.inputBorder,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.bodyBorder,
    },
    headerSpacer: { width: 36 },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: t.textPrimary,
      letterSpacing: 0.3,
    },
    closeIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.inputBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    closeIconText: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: "400",
      lineHeight: 18,
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    // Hero
    hero: {
      alignItems: "center",
      paddingVertical: 24,
      gap: 10,
    },
    heroIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 24,
      backgroundColor: t.btnBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: "900",
      color: t.textPrimary,
      letterSpacing: -0.5,
    },
    heroSub: {
      fontSize: 14,
      color: t.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 12,
    },
    // Cards
    card: {
      flexDirection: "row",
      gap: 14,
      backgroundColor: t.cardBg,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: t.btnBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    cardBody: {
      flex: 1,
      gap: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: t.textPrimary,
    },
    cardText: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 19,
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.btnBg,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      marginTop: 4,
    },
    linkText: {
      fontSize: 12,
      fontWeight: "700",
      color: t.btnText,
    },
    // Footer
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    closeBtn: {
      backgroundColor: t.btnBg,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
    },
    closeBtnText: {
      color: t.btnText,
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });
}
