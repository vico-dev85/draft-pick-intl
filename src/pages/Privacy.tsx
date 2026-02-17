import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Privacy() {
  const { t } = useTranslation("legal");

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backToHome")}</span>
          </Link>
          <img src="/logo.png" alt="Draft Pick" className="h-8 w-auto" />
        </header>

        <main className="flex-1 px-6 py-8 max-w-2xl mx-auto text-white/80 text-sm leading-relaxed">
          <h1 className="text-2xl font-bold text-white mb-6">{t("privacy.title")}</h1>
          <p className="text-white/50 mb-6">{t("privacy.lastUpdated", { date: "February 2026" })}</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.dataCollected.title")}</h2>
            <p>{t("privacy.sections.dataCollected.content")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {(t("privacy.sections.dataCollected.items", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.usage.title")}</h2>
            <p>{t("privacy.sections.usage.content")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {(t("privacy.sections.usage.items", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p>{t("privacy.sections.usage.noSelling")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.storage.title")}</h2>
            <p>{t("privacy.sections.storage.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.googleOAuth.title")}</h2>
            <p>{t("privacy.sections.googleOAuth.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.deletion.title")}</h2>
            <p>{t("privacy.sections.deletion.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("privacy.sections.contact.title")}</h2>
            <p>{t("privacy.sections.contact.content")} <a href={`mailto:${t("privacy.sections.contact.email")}`} className="text-emerald-400 hover:text-emerald-300 underline">{t("privacy.sections.contact.email")}</a></p>
          </section>
        </main>
      </div>
    </div>
  );
}
