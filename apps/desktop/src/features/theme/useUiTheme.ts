import { useCallback, useEffect, useState } from "react";
import {
  applyUiTheme,
  loadStoredUiTheme,
  UI_THEME_STORAGE_KEY,
  type UiThemeId,
} from "./themes";

export function useUiTheme() {
  const [themeId, setThemeIdState] = useState<UiThemeId>(() => loadStoredUiTheme());

  useEffect(() => {
    applyUiTheme(themeId);
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const setThemeId = useCallback((nextThemeId: UiThemeId) => {
    setThemeIdState(nextThemeId);
  }, []);

  return {
    setThemeId,
    themeId,
  };
}
