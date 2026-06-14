"use client";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toAr } from "@/lib/arabic";

const LABELS: Record<string, { ar: string; cls: string }> = {
  "Property Owner": { ar: "مالك عقار", cls: "bg-brand-50 text-brand-700" },
  Broker: { ar: "وسيط", cls: "bg-blue-50 text-blue-700" },
  "Not Interested": { ar: "غير مهتم", cls: "bg-gray-100 text-gray-600" },
  "Contact Later": { ar: "تواصل لاحقًا", cls: "bg-amber-50 text-amber-700" },
  "Property Rented": { ar: "تم التأجير", cls: "bg-purple-50 text-purple-700" },
  "Property Not Available": { ar: "غير متاح", cls: "bg-rose-50 text-rose-700" },
  "Wrong Number": { ar: "رقم خطأ", cls: "bg-gray-100 text-gray-500" },
  "Interested Buyer or Tenant": { ar: "مهتم", cls: "bg-emerald-50 text-emerald-700" },
  Unknown: { ar: "غير محدد", cls: "bg-gray-100 text-gray-500" },
};

export default function LeadsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setRows((d.conversations || []).filter((c: any) => c.classification)))
      .catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (filter ? rows.filter((r) => r.classification === filter) : rows),
    [rows, filter]
  );

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">العملاء المحتملون</h1>
          <p className="text-ink-800/60 mt-1">العملاء المصنّفون تلقائيًا حسب ردودهم</p>
        </div>
        <a href="/api/export?type=leads" className="badge bg-brand-50 text-brand-700 px-4 py-2">
          <Download className="w-4 h-4" /> تصدير Excel
        </a>
      </header>

      {/* فلاتر سريعة */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("")}
          className={`badge px-3 py-1.5 ${filter === "" ? "bg-ink-900 text-white" : "bg-white border"}`}>
          الكل
        </button>
        {Object.entries(LABELS).map(([key, l]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`badge px-3 py-1.5 ${filter === key ? "bg-ink-900 text-white" : l.cls}`}>
            {l.ar}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-center border-b bg-sand/40">
              <th className="py-3 px-4 font-medium text-center">الاسم</th>
              <th className="py-3 px-4 font-medium text-center">الهاتف</th>
              <th className="py-3 px-4 font-medium text-center">التصنيف</th>
              <th className="py-3 px-4 font-medium text-center">الملخص</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-ink-800/40">لا يوجد عملاء بعد</td></tr>
            )}
            {filtered.map((c) => {
              const lab = LABELS[c.classification] || LABELS.Unknown;
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-sand/30 text-center">
                  <td className="py-3 px-4 text-center">{c.name || "بدون اسم"}</td>
                  <td className="py-3 px-4 font-mono text-xs text-center" dir="ltr">{c.phone}</td>
                  <td className="py-3 px-4 text-center"><span className={`badge ${lab.cls}`}>{lab.ar}</span></td>
                  <td className="py-3 px-4 text-ink-800/60 text-center">{toAr(c.aiSummary)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
