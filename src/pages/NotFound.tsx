import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("common");

  useEffect(() => {
    // Don't log OAuth callback URLs as errors - these are handled by the app
    if (location.pathname.includes("access_token=") || location.pathname.includes("error=")) {
      return;
    }
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Don't render 404 page for OAuth callbacks - let the handler deal with it
  if (location.pathname.includes("access_token=") || location.pathname.includes("error=")) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notFound.title")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.message")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("notFound.backHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
