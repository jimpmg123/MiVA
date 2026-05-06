import type { ComponentProps } from "react";
import { RuntimePage } from "../pages/RuntimePage";

type RuntimeHostProps = ComponentProps<typeof RuntimePage>;

export function RuntimeHost(props: RuntimeHostProps) {
  return <RuntimePage {...props} />;
}
