import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import Icon from "./Icon";

interface Props {
  text: string;
  size?: number;
  color?: string;
}

export function ReadAloudButton({ text, size = 18, color }: Props) {
  const paperTheme = useTheme();
  const tts = useTextToSpeech();
  const iconColor = color ?? paperTheme.colors.primary;

  const handlePress = () => {
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      tts.speak(text);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => tts.stop()}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon
        name={
          tts.isSpeaking && !tts.isPaused
            ? "pause-circle-outline"
            : "play-circle-outline"
        }
        size={size}
        color={iconColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
});
