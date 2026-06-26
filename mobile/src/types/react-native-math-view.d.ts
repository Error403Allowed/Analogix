// Minimal local types for `react-native-math-view` (which has no @types package).
declare module "react-native-math-view" {
  import { Component } from "react";
  import { ViewProps, StyleProp, ViewStyle } from "react-native";
  export interface MathViewProps extends ViewProps {
    math?: string;
    color?: string;
    fontSize?: number;
    style?: StyleProp<ViewStyle>;
  }
  export default class MathView extends Component<MathViewProps> {}
  export const MathView_: React.FC<MathViewProps>;
  // Some imports use named { MathView }
  export { MathView_ as MathView };
}
