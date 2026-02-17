import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Terms() {
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
          <h1 className="text-2xl font-bold text-white mb-6">{t("terms.title")}</h1>
          <p className="text-white/50 mb-6">{t("terms.lastUpdated", { date: "February 2026" })}</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.acceptance.title")}</h2>
            <p>{t("terms.sections.acceptance.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.description.title")}</h2>
            <p>{t("terms.sections.description.content")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {(t("terms.sections.description.items", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.accounts.title")}</h2>
            <p>{t("terms.sections.accounts.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.conduct.title")}</h2>
            <p>{t("terms.sections.conduct.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.liability.title")}</h2>
            <p>{t("terms.sections.liability.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.changes.title")}</h2>
            <p>{t("terms.sections.changes.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">{t("terms.sections.contact.title")}</h2>
            <p>{t("terms.sections.contact.content")} <a href={`mailto:${t("terms.sections.contact.email")}`} className="text-emerald-400 hover:text-emerald-300 underline">{t("terms.sections.contact.email")}</a></p>
          </section>
        </main>
      </div>
    </div>
  );
}
