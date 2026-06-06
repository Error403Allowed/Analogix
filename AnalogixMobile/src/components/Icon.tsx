/**
 * Local wrapper around the new per-family `@react-native-vector-icons/material-design-icons`.
 * The package exports a single `<MaterialDesignIcons name="..." />` component (not a default),
 * and types every `name` prop as a literal union of ~7000 strings, which breaks dynamic
 * dispatch from data-driven UIs. This wrapper re-exports the component with a permissive
 * `name: string` prop and a default export.
 */
import * as React from "react";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

type MdiBaseProps = React.ComponentProps<typeof MaterialDesignIcons>;
export type IconProps = Omit<MdiBaseProps, "name"> & { name: string };

export default function Icon(props: IconProps): React.ReactElement {
   
  return <MaterialDesignIcons {...(props as any)} />;
}
