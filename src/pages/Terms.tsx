import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/ui/logo";

export default function Terms() {
  const { t } = useTranslation("legal");

  return (
    <div className="min-h-screen bg-background bg-mesh-light">
      <div className="min-h-screen flex flex-col">
        <header className="p-4 flex items-center justify-between border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backToHome")}</span>
          </Link>
          <Logo size="md" />
        </header>

        <main className="flex-1 px-6 py-8 max-w-2xl mx-auto text-muted-foreground text-sm leading-relaxed">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-6">{t("terms.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("terms.lastUpdated", { date: "February 2026" })}</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.acceptance.title")}</h2>
            <p>{t("terms.sections.acceptance.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.description.title")}</h2>
            <p>{t("terms.sections.description.content")}</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {(t("terms.sections.description.items", { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.accounts.title")}</h2>
            <p>{t("terms.sections.accounts.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.conduct.title")}</h2>
            <p>{t("terms.sections.conduct.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.liability.title")}</h2>
            <p>{t("terms.sections.liability.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.changes.title")}</h2>
            <p>{t("terms.sections.changes.content")}</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground">{t("terms.sections.contact.title")}</h2>
            <p>{t("terms.sections.contact.content")} <a href={`mailto:${t("terms.sections.contact.email")}`} className="text-primary hover:text-primary/80 underline">{t("terms.sections.contact.email")}</a></p>
          </section>
        </main>
      </div>
    </div>
  );
}
