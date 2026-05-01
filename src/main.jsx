// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { Provider } from "react-redux";

import App from "./App.jsx";
import GlobalStyles from "./Styles/GlobalStyles.js";
import theme from "./Styles/theme.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { store } from "./store/store.js";

// ✅ NEW: global language system
import { I18nProvider } from "./i18n";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider placement="top-right" max={6} defaultDuration={4500}>
              <I18nProvider>
                <App />
              </I18nProvider>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
