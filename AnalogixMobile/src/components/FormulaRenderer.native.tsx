import React from "react";
import { Text as RNText } from "react-native";

interface Props {
  math: string;
  style?: object;
  minHeight?: number;
}

let NativeMathView: React.FC<Props> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NativeMathView = require("react-native-math-view").default as React.FC<Props>;
} catch {
  // fall through to plain-text rendering below
}

export default function FormulaRenderer(props: Props) {
  if (NativeMathView) {
    return <NativeMathView {...props} />;
  }
  return (
    <RNText style={{ fontFamily: "monospace", color: "#333", ...props.style }}>
      {props.math}
    </RNText>
  );
}
