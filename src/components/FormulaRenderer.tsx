import React from "react";
import { Text } from "react-native";

interface Props {
  math: string;
  style?: object;
  minHeight?: number;
}

export default function FormulaRenderer(props: Props) {
  return (
    <Text style={{ fontFamily: "monospace", color: "#333", ...props.style }}>
      {props.math}
    </Text>
  );
}
