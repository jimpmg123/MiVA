import type { ComponentProps } from "react";
import { StudioPage } from "../pages/StudioPage";

type StudioHostProps = ComponentProps<typeof StudioPage>;

export function StudioHost(props: StudioHostProps) {
  return <StudioPage {...props} />;
}
