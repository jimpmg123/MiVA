import type { ComponentProps } from "react";
import { HistoryPage } from "../pages/HistoryPage";

type HistoryHostProps = ComponentProps<typeof HistoryPage>;

export function HistoryHost(props: HistoryHostProps) {
  return <HistoryPage {...props} />;
}
