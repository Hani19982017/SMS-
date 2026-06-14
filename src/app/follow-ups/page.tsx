"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Check, MessageCircle, MessageSquare } from "lucide-react";

const PRIORITY: Record<string, { ar: string; cls: string }> = {
  HIGH: { ar: "عالية", cls: "bg-rose-50 text-rose-700" },
  MEDIUM: { ar: "متوسطة", cls: "bg-amber-50 text-amber-700" },
  LOW: { ar: "منخفضة", cls: "bg-gray-100 text-gray-600" },
};
const STATUS: Record<string, string> = { PENDING: "قيد الانتظار", DONE: "تمت", CANCELLED: "ملغاة" };

export default function FollowUpsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);

  const load = () =>
    fetch("/api/follow-ups").then((r) => r.json()).then((d) => setRows(d.followUps || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  async function markDone(id: string) {
    await fetch("/api/follow-ups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "DONE" }),
    });
    load();
  }

  // فتح واتساب العميل، ثم سؤال للتأكيد قبل تحويل المتابعة إلى «تمت»
  function contactViaWhatsApp(f: any) {
    const waLink = `https://wa.me/${(f.phone || "").replace(/[^\d]/g, "")}`;
    window.open(waLink, "_blank");
    setTimeout(() => {
      if (f.status === "PENDING" && confirm("تم التواصل مع العميل؟ سيتم تحويل المتابعة إلى «تمت».")) {
        markDone(f.id);
      }
    }, 600);
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">المتابعات</h1>
          <p className="text-ink-800/60 mt-1">المهام التي تتطلب متابعة يدوية مع العملاء</p>
        </div>
        <a href="/api/export?type=followups" className="badge bg-brand-50 text-brand-700 px-4 py-2">
          <Download className="w-4 h-4" /> تصدير Excel
        </a>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-center border-b bg-sand/40">
              <th className="py-3 px-4 font-medium text-center">العميل</th>
              <th className="py-3 px-4 font-medium text-center">الهاتف</th>
              <th className="py-3 px-4 font-medium text-center">موعد المتابعة</th>
              <th className="py-3 px-4 font-medium text-center">الأولوية</th>
              <th className="py-3 px-4 font-medium text-center">الحالة</th>
              <th className="py-3 px-4 font-medium text-center">متابعة العميل</th>
              <th className="py-3 px-4 font-medium text-center">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-ink-800/40">لا توجد متابعات بعد</td></tr>
            )}
            {rows.map((f) => {
              const pr = PRIORITY[f.priority] || PRIORITY.MEDIUM;
              return (
                <tr key={f.id} className="border-b last:border-0 hover:bg-sand/30 text-center">
                  <td className="py-3 px-4 text-center">{f.name || "—"}</td>
                  <td className="py-3 px-4 font-mono text-xs text-center" dir="ltr">{f.phone}</td>
                  <td className="py-3 px-4 text-center">{new Date(f.dueDate).toLocaleDateString("ar-EG")}</td>
                  <td className="py-3 px-4 text-center"><span className={`badge ${pr.cls}`}>{pr.ar}</span></td>
                  <td className="py-3 px-4 text-center">{STATUS[f.status]}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => contactViaWhatsApp(f)}
                        title="فتح واتساب العميل ثم تأكيد المتابعة"
                        className="badge bg-brand-500 text-white px-3 py-1.5 inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> واتساب
                      </button>
                      {f.conversationId && (
                        <button
                          onClick={() => router.push(`/conversations/${f.conversationId}`)}
                          title="فتح المحادثة داخل النظام"
                          className="badge bg-ink-900 text-white px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> محادثة
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {f.status === "PENDING" && (
                      <button onClick={() => markDone(f.id)}
                        className="badge bg-emerald-50 text-emerald-700 px-3 py-1.5 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> تمت
                      </button>
                    )}
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
