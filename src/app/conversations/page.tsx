"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

// خريطة التصنيفات إلى عربي + لون
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

export default function ConversationsPage() {
  const [convs, setConvs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/conversations").then((r) => r.json()).then((d) => setConvs(d.conversations || [])).catch(() => {});
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">المحادثات</h1>
        <p className="text-ink-800/60 mt-1">جميع الردود مع التصنيف التلقائي بالذكاء الاصطناعي — اضغط على المحادثة لعرض الصور</p>
      </header>

      <div className="card divide-y">
        {convs.length === 0 && (
          <p className="p-6 text-sm text-ink-800/50">لا توجد محادثات بعد. ستظهر هنا فور رد العملاء.</p>
        )}
        {convs.map((c) => {
          const lab = LABELS[c.classification] || LABELS.Unknown;
          return (
            <Link
              key={c.id}
              href={`/conversations/${c.id}`}
              className="p-4 flex items-center gap-4 hover:bg-sand/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-brand-50 grid place-items-center text-brand-700 font-bold">
                {(c.name || c.phone || "?").slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name || "بدون اسم"}</span>
                  <span className="text-xs font-mono text-ink-800/40" dir="ltr">{c.phone}</span>
                  {c.mediaCount > 0 && (
                    <span className="badge bg-brand-50 text-brand-700 text-[10px] px-2 py-0.5 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {c.mediaCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-800/60 truncate">{c.lastMessage || "—"}</p>
              </div>
              {c.classification && <span className={`badge ${lab.cls}`}>{lab.ar}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
