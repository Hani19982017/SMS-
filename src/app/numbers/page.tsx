"use client";
import { useEffect, useState } from "react";
import { Plus, Phone, Trash2, Power } from "lucide-react";

export default function NumbersPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayNumber, setDisplayNumber] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/whatsapp-accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => {});
  };
  useEffect(load, []);

  async function create() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/whatsapp-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, phoneNumberId, displayNumber, businessAccountId, accessToken }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg("تمت إضافة الرقم ✅");
      setShowForm(false);
      setLabel(""); setPhoneNumberId(""); setDisplayNumber(""); setBusinessAccountId(""); setAccessToken("");
      load();
    } else {
      setMsg(data.error || "حدث خطأ");
    }
    setBusy(false);
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch(`/api/whatsapp-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا الرقم؟ الحملات التي تستخدمه ستتحول إلى التوزيع التلقائي.")) return;
    await fetch(`/api/whatsapp-accounts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">أرقام واتساب</h1>
          <p className="text-ink-800/60 mt-1">
            أضف أرقام شركتك للإرسال منها. اختر رقمًا محددًا لكل حملة أو فعّل التوزيع التلقائي.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> إضافة رقم
        </button>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm">{msg}</div>}

      {showForm && (
        <div className="card p-6 mb-6 space-y-3">
          <input
            placeholder="اسم وصفي للرقم (مثال: الرقم الرئيسي)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500"
          />
          <input
            placeholder="Phone Number ID (من Meta)"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500 font-mono text-sm"
          />
          <input
            placeholder="الرقم الظاهر للعملاء (اختياري، مثال: +20100…)"
            value={displayNumber}
            onChange={(e) => setDisplayNumber(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500"
          />
          <input
            placeholder="WhatsApp Business Account ID (اختياري)"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500 font-mono text-sm"
          />
          <input
            placeholder="توكن خاص بهذا الرقم (اختياري — اتركه فارغًا لاستخدام التوكن الافتراضي)"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-500 font-mono text-sm"
          />
          <button
            onClick={create}
            disabled={!label || !phoneNumberId || busy}
            className="px-5 py-2.5 rounded-xl bg-ink-900 text-white text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <Phone className="w-4 h-4" /> حفظ الرقم
          </button>
          <p className="text-xs text-ink-800/50">
            إن كانت كل أرقامك تحت نفس الحساب والتوكن، اترك حقل التوكن فارغًا — سيُستخدم التوكن الافتراضي تلقائيًا.
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-right border-b bg-sand/40">
              <th className="py-3 px-4 font-medium">الاسم</th>
              <th className="py-3 px-4 font-medium">الرقم الظاهر</th>
              <th className="py-3 px-4 font-medium">Phone Number ID</th>
              <th className="py-3 px-4 font-medium">التوكن</th>
              <th className="py-3 px-4 font-medium">الحالة</th>
              <th className="py-3 px-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ink-800/40">
                  لا توجد أرقام بعد — أضف أول رقم لتبدأ الإرسال منه
                </td>
              </tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-sand/30">
                <td className="py-3 px-4 font-semibold">{a.label}</td>
                <td className="py-3 px-4">{a.displayNumber || "—"}</td>
                <td className="py-3 px-4 font-mono text-xs">{a.phoneNumberId}</td>
                <td className="py-3 px-4">
                  <span className={`badge ${a.hasOwnToken ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                    {a.hasOwnToken ? "توكن خاص" : "افتراضي"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${a.isActive ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.isActive ? "مفعّل" : "معطّل"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggle(a.id, a.isActive)}
                      title={a.isActive ? "تعطيل" : "تفعيل"}
                      className="p-2 rounded-lg hover:bg-black/5"
                    >
                      <Power className={`w-4 h-4 ${a.isActive ? "text-brand-600" : "text-gray-400"}`} />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      title="حذف"
                      className="p-2 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
