"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";

// ترجمة حالة القالب إلى العربية مع لون مناسب
const STATUS_AR: Record<string, { ar: string; cls: string }> = {
  APPROVED: { ar: "معتمد", cls: "bg-brand-50 text-brand-700" },
  PENDING: { ar: "قيد المراجعة", cls: "bg-amber-50 text-amber-700" },
  REJECTED: { ar: "مرفوض", cls: "bg-rose-50 text-rose-700" },
  DRAFT: { ar: "مسودة", cls: "bg-gray-100 text-gray-600" },
};

// ترجمة رمز اللغة إلى اسم عربي
const LANG_AR: Record<string, string> = {
  ar: "عربي",
  en_US: "إنجليزي",
  en: "إنجليزي",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // حقول النموذج
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("ar");
  const [variableCount, setVariableCount] = useState(0);
  const [bodyText, setBodyText] = useState("");

  const load = () =>
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  async function addTemplate() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, language, variableCount, bodyText, category: "MARKETING", status: "APPROVED" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("تمت إضافة القالب ✅");
      setName(""); setBodyText(""); setVariableCount(0); setShowForm(false);
      load();
    } else {
      setMsg(data.error || "حدث خطأ");
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا القالب؟")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">القوالب</h1>
          <p className="text-ink-800/60 mt-1">إدارة قوالب الرسائل المعتمدة من Meta</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> قالب جديد
        </button>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm">{msg}</div>}

      {/* تنبيه مهم */}
      <div className="card p-4 mb-4 bg-amber-50 border-amber-200 text-sm text-amber-800">
        ⚠️ القالب يجب أن يكون <b>معتمدًا في Meta أولًا</b> بنفس الاسم واللغة تمامًا. هذه الصفحة تسجّل القالب في النظام فقط ليظهر في الحملات.
      </div>

      {showForm && (
        <div className="card p-6 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">اسم القالب (كما في Meta)</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="مثال: intro_real_estate"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500 font-mono text-sm" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">اللغة</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none">
                <option value="ar">عربي (ar)</option>
                <option value="en_US">إنجليزي (en_US)</option>
              </select>
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium mb-1">عدد المتغيرات</label>
              <input type="number" min={0} value={variableCount}
                onChange={(e) => setVariableCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نص القالب (للعرض فقط)</label>
            <textarea rows={3} value={bodyText} onChange={(e) => setBodyText(e.target.value)}
              placeholder="أهلاً {{1}}، معاك فريق التسويق العقاري..."
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none text-sm" />
          </div>
          <button onClick={addTemplate} disabled={!name || busy}
            className="px-5 py-2.5 rounded-xl bg-ink-900 text-white text-sm disabled:opacity-40">
            حفظ القالب
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-center border-b bg-sand/40">
              <th className="py-3 px-4 font-medium text-center">الاسم</th>
              <th className="py-3 px-4 font-medium text-center">اللغة</th>
              <th className="py-3 px-4 font-medium text-center">المتغيرات</th>
              <th className="py-3 px-4 font-medium text-center">الحالة</th>
              <th className="py-3 px-4 font-medium text-center">حذف</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-ink-800/40">لا توجد قوالب بعد</td></tr>
            )}
            {templates.map((t) => {
              const st = STATUS_AR[t.status] || { ar: t.status, cls: "bg-gray-100 text-gray-600" };
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-sand/30 text-center">
                  <td className="py-3 px-4 font-mono text-xs">
                    <span className="inline-flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" /> {t.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">{LANG_AR[t.language] || t.language}</td>
                  <td className="py-3 px-4 text-center">{t.variableCount}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`badge ${st.cls}`}>{st.ar}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => remove(t.id)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
