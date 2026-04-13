import { Audio } from "expo-av";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";

export function useSounds() {
  const successSoundRef = useRef<Audio.Sound | null>(null);
  const errorSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
        const { sound: successSound } = await Audio.Sound.createAsync(
          require("../assets/sounds/success.mp3"),
        );
        const { sound: errorSound } = await Audio.Sound.createAsync(
          require("../assets/sounds/error.mp3"),
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

  const initiateSuccessUX = async () => {
    if (Platform.OS === "android")
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (successSoundRef.current) await successSoundRef.current.replayAsync();
    } catch (e) {
      console.log("Success sound error:", e);
    }
  };

  const initiateErrorUX = async () => {
    if (Platform.OS === "android")
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    try {
      if (errorSoundRef.current) await errorSoundRef.current.replayAsync();
    } catch (e) {
      console.log("Error sound error:", e);
    }
  };

  return { initiateSuccessUX, initiateErrorUX };
}
