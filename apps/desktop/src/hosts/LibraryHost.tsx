import type { ComponentProps } from "react";
import { LibraryPage } from "../pages/LibraryPage";

type LibraryHostProps = ComponentProps<typeof LibraryPage>;

export function LibraryHost(props: LibraryHostProps) {
  return <LibraryPage {...props} />;
}
