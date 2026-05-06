import type { ComponentProps } from "react";
import { SettingsPage } from "../pages/SettingsPage";

type SettingsHostProps = ComponentProps<typeof SettingsPage>;

export function SettingsHost(props: SettingsHostProps) {
  return <SettingsPage {...props} />;
}
