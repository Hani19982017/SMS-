"use client";
import { useEffect, useState } from "react";
import { Save, Mail, Send } from "lucide-react";

export default function SettingsPage() {
  const [s, setS] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setS(d.settings || {})).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setS((p) => ({ ...p, [k]: v }));

  async function save() {
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setMsg(res.ok ? "تم الحفظ ✅" : "تعذّر الحفظ (تأكد أنك مدير)");
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg("");
    // احفظ أولًا حتى يُختبر بأحدث القيم
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const res = await fetch("/api/settings/test-email", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setTestMsg(res.ok ? "تم إرسال إيميل تجريبي ✅ تحقّق من بريدك" : `فشل: ${data.error || "تأكد من البيانات"}`);
    setTesting(false);
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">الإعدادات</h1>
        <p className="text-ink-800/60 mt-1">إعدادات الذكاء الاصطناعي والردود التلقائية والإشعارات</p>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm">{msg}</div>}

      {/* ===== قسم إشعارات الإيميل ===== */}
      <div className="card p-6 space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-ink-900">إشعارات الإيميل (Gmail)</h2>
        </div>
        <p className="text-sm text-ink-800/60">
          يصلك إيميل تلقائيًا عندما يرسل عميل رسالة لا يستطيع الذكاء الاصطناعي الرد عليها.
        </p>

        <Field label="إيميل استقبال الإشعارات">
          <input type="email" value={s.notify_email || ""} onChange={(e) => set("notify_email", e.target.value)}
            placeholder="example@gmail.com"
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500" />
        </Field>

        <Field label="إيميل Gmail المُرسِل">
          <input type="email" value={s.smtp_user || ""} onChange={(e) => set("smtp_user", e.target.value)}
            placeholder="yourname@gmail.com"
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500" />
        </Field>

        <Field label="App Password (كلمة مرور التطبيقات — 16 حرف)">
          <input type="password" value={s.smtp_pass || ""} onChange={(e) => set("smtp_pass", e.target.value)}
            placeholder={s.smtp_pass_set ? "•••••••••••• (محفوظة — اكتب جديدة للتغيير)" : "xxxx xxxx xxxx xxxx"}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500 font-mono" />
          <p className="text-xs text-ink-800/50 mt-1">
            ليست كلمة مرور Gmail العادية. أنشئها من: myaccount.google.com/apppasswords (بعد تفعيل التحقق بخطوتين).
          </p>
        </Field>

        <div className="flex items-center gap-3">
          <button onClick={save}
            className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2">
            <Save className="w-4 h-4" /> حفظ
          </button>
          <button onClick={sendTest} disabled={testing}
            className="px-5 py-2.5 rounded-xl bg-ink-900 text-white text-sm flex items-center gap-2 disabled:opacity-40">
            <Send className="w-4 h-4" /> {testing ? "جارٍ الإرسال…" : "إرسال إيميل تجريبي"}
          </button>
        </div>
        {testMsg && <div className="text-sm">{testMsg}</div>}
      </div>

      {/* ===== إعدادات الذكاء الاصطناعي ===== */}
      <div className="card p-6 space-y-5">
        <Field label="مزوّد الذكاء الاصطناعي">
          <select value={s.ai_provider || "gemini"} onChange={(e) => set("ai_provider", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none">
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </Field>

        <Field label="الفاصل الزمني الافتراضي للإرسال (ثانية)">
          <input type="number" value={s.default_delay_sec || "20"} onChange={(e) => set("default_delay_sec", e.target.value)}
            className="w-32 px-4 py-2.5 rounded-xl border border-black/10 outline-none" />
        </Field>

        <Field label="تعليمات الذكاء الاصطناعي (Prompt)">
          <textarea rows={6} value={s.ai_prompt || ""} onChange={(e) => set("ai_prompt", e.target.value)}
            placeholder="اتركه فارغًا لاستخدام التعليمات الافتراضية المدمجة"
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none font-mono text-xs leading-relaxed" />
        </Field>

        <div className="border-t pt-4">
          <h3 className="font-bold mb-3">الردود التلقائية حسب التصنيف</h3>
          {[
            ["autoreply_Property Owner", "مالك عقار"],
            ["autoreply_Not Interested", "غير مهتم"],
            ["autoreply_Contact Later", "تواصل لاحقًا"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between py-2">
              <span className="text-sm">{label}</span>
              <input type="checkbox" checked={(s[key] ?? "on") === "on"}
                onChange={(e) => set(key, e.target.checked ? "on" : "off")}
                className="w-5 h-5 accent-brand-500" />
            </label>
          ))}
        </div>

        <button onClick={save}
          className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2">
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-800/80 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
