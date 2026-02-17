import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-4 flex items-center justify-between" dir="rtl">
          <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowRight className="h-4 w-4" />
            <span>חזרה</span>
          </Link>
          <img src="/logo.png" alt="kohot.online" className="h-8 w-auto" />
        </header>

        <main className="flex-1 px-6 py-8 max-w-2xl mx-auto text-white/80 text-sm leading-relaxed" dir="rtl">
          <h1 className="text-2xl font-bold text-white mb-6">תנאי שימוש</h1>
          <p className="text-white/50 mb-6">עדכון אחרון: פברואר 2026</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">קבלת התנאים</h2>
            <p>בשימוש ב-kohot.online אתם מסכימים לתנאים אלה. אם אינכם מסכימים, אנא הפסיקו להשתמש בשירות.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">השירות</h2>
            <p>kohot.online מספק פלטפורמה לארגון דראפט קבוצות לכדורגל חובבני. השירות מאפשר:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>יצירת דראפט חי לבחירת קבוצות</li>
              <li>ניהול רשימת שחקנים</li>
              <li>שיתוף תוצאות דרך WhatsApp</li>
            </ul>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">חשבון משתמש</h2>
            <p>חלק מהשירותים דורשים יצירת חשבון. אתם אחראים לשמור על אבטחת החשבון שלכם. שימוש בדראפט מהיר אינו דורש חשבון.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">שימוש מותר</h2>
            <p>השירות מיועד לשימוש אישי לארגון משחקי כדורגל חובבניים. אין להשתמש בשירות לפעילות לא חוקית או מזיקה.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">הגבלת אחריות</h2>
            <p>השירות מסופק "כמות שהוא" (as is). אנחנו עושים את המיטב כדי לספק שירות אמין, אך איננו מתחייבים לזמינות 100% או לתוצאות ספציפיות.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">שינויים בתנאים</h2>
            <p>אנו עשויים לעדכן תנאים אלה מעת לעת. שימוש מתמשך בשירות לאחר עדכון מהווה הסכמה לתנאים החדשים.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">יצירת קשר</h2>
            <p>לשאלות בנוגע לתנאי השימוש: <a href="mailto:info@kohot.online" className="text-emerald-400 hover:text-emerald-300 underline">info@kohot.online</a></p>
          </section>
        </main>
      </div>
    </div>
  );
}
