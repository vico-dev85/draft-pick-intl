import { Component, type ReactNode } from "react";
import i18next from "i18next";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(to bottom, #4c1d95, #3b0764, #4c1d95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: "16px",
              padding: "32px 24px",
              border: "1px solid rgba(255,255,255,0.1)",
              textAlign: "center",
              maxWidth: "320px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚽</div>
            <h1
              style={{
                color: "white",
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              {i18next.t("common:errors.somethingWentWrong", "Something went wrong")}
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "14px",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              {i18next.t("common:errors.unexpectedError", "An unexpected error occurred. Click to refresh.")}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#7C3AED",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 32px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
              }}
            >
              {i18next.t("common:errors.refreshPage", "Refresh Page")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
