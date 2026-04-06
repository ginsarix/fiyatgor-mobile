import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
  Keyboard,
} from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce } from "lodash";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ThemeColors, useTheme } from "@/constants/theme";

type Props = PropsWithChildren<{
  serverCodeChanged: (serverCode: string) => unknown;
  isVisible: boolean;
  onClose: () => void;
}>;

const DISMISS_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 1500;

const useGradualAnimation = () => {
  const height = useSharedValue(0);
  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        height.value = Math.max(event.height, 0);
      },
    },
    [],
  );
  return { height };
};

export default function ServerCodeModal({
  serverCodeChanged,
  isVisible,
  onClose,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [hasEverSaved, setHasEverSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverCode, setServerCode] = useState("");

  const translateY = useSharedValue(800);
  const { height } = useGradualAnimation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      setServerCode((await AsyncStorage.getItem("server-code")) ?? "diademo");
    })();
  }, []);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 50, stiffness: 300 });
    }
  }, [isVisible]);

  const debouncedServerCodeSetter = useMemo(
    () =>
      debounce((value: string) => {
        AsyncStorage.setItem("server-code", value);
        setHasEverSaved(true);
        setSaving(false);
      }, 750),
    [],
  );

  useEffect(() => {
    serverCodeChanged(serverCode);
  }, [serverCode]);

  function setServerCodeInput(v: string) {
    setServerCode(v);
    setSaving(true);
    debouncedServerCodeSetter(v);
  }

  const dismissSheet = () => {
    translateY.value = 800;
    Keyboard.dismiss();
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
          if (finished) runOnJS(dismissSheet)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 50, stiffness: 300 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const keyboardOffset = height.value;
    const offset = Platform.OS === "android" ? insets.bottom : 0;
    const keyboardTranslation =
      keyboardOffset <= 0 || translateY.value > 0
        ? 0
        : Math.max(keyboardOffset - offset, 0);

    return {
      transform: [{ translateY: translateY.value - keyboardTranslation }],
    };
  }, [height, insets.bottom]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.modalContent, animatedStyle]}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Sunucu Kodunu Değiştir</Text>
                <Pressable onPress={onClose}>
                  <MaterialIcons name="close" color="#fff" size={22} />
                </Pressable>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Sunucu Kodu</Text>
                <TextInput
                  placeholder="Sunucu Kodu"
                  placeholderTextColor={t.inputPlaceholder}
                  onChangeText={setServerCodeInput}
                  value={serverCode}
                  style={styles.input}
                />
                <Text style={styles.saveStateText}>
                  {saving
                    ? "Kaydediliyor..."
                    : hasEverSaved && !saving && "Kaydedildi"}
                </Text>
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
      justifyContent: "flex-end",
    },
    modalContent: {
      width: "100%",
      backgroundColor: t.modalSheetBg,
      borderTopRightRadius: 18,
      borderTopLeftRadius: 18,
      paddingBottom: Platform.OS === "ios" ? 20 : 10,
    },
    titleContainer: {
      backgroundColor: t.modalTitleBarBg,
      borderTopRightRadius: 10,
      borderTopLeftRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: "#fff",
      fontSize: 16,
    },
    inputContainer: {
      padding: 16,
    },
    label: {
      color: t.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: t.inputBg,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: t.inputBorder,
      fontSize: 16,
      color: t.inputText,
    },
    saveStateText: {
      fontSize: 12,
      color: t.saveStateText,
      marginTop: 4,
    },
  });
}
