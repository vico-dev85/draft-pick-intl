import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Privacy() {
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
          <h1 className="text-2xl font-bold text-white mb-6">מדיניות פרטיות</h1>
          <p className="text-white/50 mb-6">עדכון אחרון: פברואר 2026</p>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">מידע שאנחנו אוספים</h2>
            <p>כאשר אתם משתמשים ב-kohot.online, אנו עשויים לאסוף את המידע הבא:</p>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>כתובת אימייל (בעת הרשמה או התחברות עם Google)</li>
              <li>שם ותמונת פרופיל (מחשבון Google, אם התחברתם דרכו)</li>
              <li>שמות שחקנים שהוספתם לרשימת המועדון שלכם</li>
              <li>נתוני דראפט (קבוצות, בחירות, תוצאות)</li>
            </ul>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">איך אנחנו משתמשים במידע</h2>
            <ul className="list-disc list-inside space-y-1 mr-4">
              <li>כדי לאפשר את שירות הדראפט וניהול הקבוצות</li>
              <li>כדי לזהות אתכם בעת התחברות חוזרת</li>
              <li>כדי לשפר את השירות שלנו</li>
            </ul>
            <p>אנחנו לא מוכרים את המידע שלכם לצדדים שלישיים.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">אחסון מידע</h2>
            <p>המידע שלכם מאוחסן בצורה מאובטחת בשרתי Supabase. אנו משתמשים בהצפנה ואימות מאובטח כדי להגן על הנתונים שלכם.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">Google OAuth</h2>
            <p>כאשר אתם מתחברים עם Google, אנו מקבלים גישה לשם, כתובת אימייל ותמונת הפרופיל שלכם בלבד. אנחנו לא מקבלים גישה לאנשי הקשר, האימיילים או כל מידע אחר בחשבון Google שלכם.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">מחיקת מידע</h2>
            <p>אתם יכולים לבקש מחיקת המידע שלכם בכל עת על ידי פנייה אלינו. ניתן גם לנתק את חשבון Google שלכם מהגדרות החשבון ב-Google.</p>
          </section>

          <section className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-white">יצירת קשר</h2>
            <p>לשאלות בנוגע לפרטיות: <a href="mailto:privacy@kohot.online" className="text-emerald-400 hover:text-emerald-300 underline">privacy@kohot.online</a></p>
          </section>
        </main>
      </div>
    </div>
  );
}
