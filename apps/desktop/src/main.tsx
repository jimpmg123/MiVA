import React from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { CharacterOverlayApp } from "./features/characters/CharacterOverlayApp";
import { initUiTheme } from "./features/theme/themes";
import App from "./App";

initUiTheme();

const isCharacterOverlayEntry = new URLSearchParams(window.location.search).get("overlay") === "character";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isCharacterOverlayEntry ? <CharacterOverlayApp /> : <App />}
  </React.StrictMode>,
);
