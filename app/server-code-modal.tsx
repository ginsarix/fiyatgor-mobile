import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debounce } from "lodash";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = PropsWithChildren<{
  serverCodeChanged: (serverCode: string) => unknown;
  isVisible: boolean;
  onClose: () => void;
}>;

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
  const [hasEverSaved, setHasEverSaved] = useState(false); // a flag so that we dont show the saved text when saving is false but nothing has been ever saved (like at startup)
  const [saving, setSaving] = useState(false);

  async function getServerCodeStorage() {
    return await AsyncStorage.getItem("server-code");
  }

  async function setServerCodeStorage(serverCode: string) {
    await AsyncStorage.setItem("server-code", serverCode);
    setHasEverSaved(true);
    setSaving(false);
  }

  const [serverCode, setServerCode] = useState("");

  useEffect(() => {
    (async () => {
      setServerCode((await getServerCodeStorage()) ?? "diademo");
    })();
  }, []);
  const debouncedServerCodeSetter = useMemo(
    () =>
      debounce((value: string) => {
        setServerCodeStorage(value);
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

  const { height } = useGradualAnimation();

  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    // 1. Calculate the active height
    const activeHeight = height.value;

    // lock translation to 0 so it doesnt dip below the screen
    if (activeHeight <= 0) {
      return {
        transform: [{ translateY: 0 }],
      };
    }

    // only apply offset when keyboard is actually up
    // using Math.max to ensure its never negative
    const offset = Platform.OS === "android" ? insets.bottom : 0;
    const translation = Math.max(activeHeight - offset, 0);

    return {
      transform: [{ translateY: -translation }],
    };
  }, [height, insets.bottom]);

  return (
    <View>
      <Modal
        animationType="slide"
        allowSwipeDismissal
        onRequestClose={onClose}
        transparent={true}
        visible={isVisible}
      >
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Sunucu Kodunu Değiştir</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" color="#fff" size={22} />
            </Pressable>
          </View>
          <View style={styles.inputContainer}>
            <Text>Sunucu Kodu</Text>
            <TextInput
              placeholder="Sunucu Kodu"
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: "100%",
    backgroundColor: "#f2f3f7",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    position: "absolute",
    bottom: 0,
    paddingBottom: Platform.OS === "ios" ? 20 : 10, // for safe area
  },
  titleContainer: {
    backgroundColor: "#464C55",
    borderTopRightRadius: 10,
    borderTopLeftRadius: 10,
    paddingHorizontal: 20,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  saveStateText: {
    fontSize: 12,
  },
});
