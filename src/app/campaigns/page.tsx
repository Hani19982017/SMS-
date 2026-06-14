"use client";
import { useEffect, useState } from "react";
import { Send, Plus } from "lucide-react";

const STATUS: Record<string, { ar: string; cls: string }> = {
  DRAFT: { ar: "مسودة", cls: "bg-gray-100 text-gray-600" },
  RUNNING: { ar: "قيد الإرسال", cls: "bg-brand-50 text-brand-700" },
  PAUSED: { ar: "متوقفة", cls: "bg-amber-50 text-amber-700" },
  COMPLETED: { ar: "مكتملة", cls: "bg-blue-50 text-blue-700" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [whatsappId, setWhatsappId] = useState(""); // "" => توزيع تلقائي
  const [delay, setDelay] = useState(20);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/campaigns").then((r) => r.json()).then(setCampaigns).catch(() => {});
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates || [])).catch(() => {});
    fetch("/api/whatsapp-accounts").then((r) => r.json()).then((d) => setAccounts(d.accounts || [])).catch(() => {});
  };
  useEffect(load, []);

  const activeAccounts = accounts.filter((a) => a.isActive);

  async function create() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, templateId, sendDelaySec: Number(delay), whatsappId: whatsappId || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`تم إنشاء الحملة وإدراج ${data.queued} رسالة في الطابور ✅`);
      setShowForm(false); setName(""); setTemplateId(""); setWhatsappId("");
      load();
    } else {
      setMsg(data.error || "حدث خطأ");
    }
    setBusy(false);
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">الحملات</h1>
          <p className="text-ink-800/60 mt-1">إرسال تدريجي للأرقام الموافِقة فقط عبر قوالب معتمدة</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> حملة جديدة
        </button>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm">{msg}</div>}

      {showForm && (
        <div className="card p-6 mb-6 space-y-3">
          <input placeholder="اسم الحملة" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500" />
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500">
            <option value="">اختر القالب المعتمد</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* اختيار رقم الإرسال */}
          <div>
            <label className="text-sm text-ink-800/70 block mb-1">الإرسال من:</label>
            <select value={whatsappId} onChange={(e) => setWhatsappId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500">
              <option value="">توزيع تلقائي على كل الأرقام المفعّلة 🔄</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}{a.displayNumber ? ` — ${a.displayNumber}` : ""}
                </option>
              ))}
            </select>
            {activeAccounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                لا توجد أرقام مضافة — سيُستخدم الرقم الافتراضي من الإعدادات. أضف أرقامك من صفحة «أرقام واتساب».
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-800/70">الفاصل الزمني بين الرسائل (ثانية):</label>
            <input type="number" min={5} value={delay} onChange={(e) => setDelay(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-black/10 outline-none" />
          </div>
          <button onClick={create} disabled={!name || !templateId || busy}
            className="px-5 py-2.5 rounded-xl bg-ink-900 text-white text-sm flex items-center gap-2 disabled:opacity-40">
            <Send className="w-4 h-4" /> إنشاء وبدء الإرسال
          </button>
          <p className="text-xs text-ink-800/50">
            ملاحظة: يُرسل النظام فقط لجهات الاتصال التي وافقت (opt-in). القالب يجب أن يكون معتمدًا في Meta.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-right border-b bg-sand/40">
              <th className="py-3 px-4 font-medium">الحملة</th>
              <th className="py-3 px-4 font-medium">القالب</th>
              <th className="py-3 px-4 font-medium">الإرسال من</th>
              <th className="py-3 px-4 font-medium">عدد الرسائل</th>
              <th className="py-3 px-4 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-ink-800/40">لا توجد حملات بعد</td></tr>
            )}
            {campaigns.map((c) => {
              const st = STATUS[c.status] || STATUS.DRAFT;
              const from = c.whatsapp
                ? (c.whatsapp.label + (c.whatsapp.displayNumber ? ` — ${c.whatsapp.displayNumber}` : ""))
                : "توزيع تلقائي 🔄";
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-sand/30">
                  <td className="py-3 px-4 font-semibold">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-xs">{c.template?.name || "—"}</td>
                  <td className="py-3 px-4 text-xs">{from}</td>
                  <td className="py-3 px-4">{c._count?.messages ?? 0}</td>
                  <td className="py-3 px-4"><span className={`badge ${st.cls}`}>{st.ar}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
