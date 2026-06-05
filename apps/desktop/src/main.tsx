import React from "react";
import ReactDOM from "react-dom/client";
import { initUiTheme } from "./features/theme/themes";
import App from "./App";

initUiTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
