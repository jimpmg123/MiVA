import type { ComponentProps } from "react";
import { AuthPage } from "../pages/AuthPage";

type AuthHostProps = ComponentProps<typeof AuthPage>;

export function AuthHost(props: AuthHostProps) {
  return <AuthPage {...props} />;
}
