"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, X } from "lucide-react";

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

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [conv, setConv] = useState<any>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then(setConv)
      .catch(() => {});
  }, [id]);

  if (!conv) return <p className="text-ink-800/50">جارٍ التحميل…</p>;
  const lab = LABELS[conv.classification] || LABELS.Unknown;

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/conversations" className="p-2 rounded-lg hover:bg-black/5">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">
              {conv.name || "بدون اسم"}
            </h1>
            <span className="text-sm font-mono text-ink-800/50" dir="ltr">{conv.phone}</span>
          </div>
        </div>
        {conv.classification && <span className={`badge ${lab.cls}`}>{lab.ar}</span>}
      </header>

      <div className="card p-4 space-y-3 max-w-3xl mx-auto">
        {conv.messages.length === 0 && (
          <p className="text-center text-ink-800/40 py-8">لا توجد رسائل</p>
        )}
        {conv.messages.map((m: any) => {
          const inbound = m.direction === "INBOUND";
          return (
            <div key={m.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  inbound ? "bg-sand text-ink-900" : "bg-brand-500 text-white"
                }`}
              >
                {/* صور الرسالة */}
                {m.media && m.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.media.map((md: any) =>
                      md.isImage ? (
                        <img
                          key={md.id}
                          src={`/api/media/${md.id}`}
                          alt={md.caption || "صورة"}
                          onClick={() => setLightbox(`/api/media/${md.id}`)}
                          className="w-32 h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 border border-black/10"
                        />
                      ) : (
                        <a
                          key={md.id}
                          href={`/api/media/${md.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm underline"
                        >
                          <Download className="w-4 h-4" /> فتح المرفق
                        </a>
                      )
                    )}
                  </div>
                )}
                {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
                <div className={`text-[10px] mt-1 ${inbound ? "text-ink-800/40" : "text-white/70"}`}>
                  {new Date(m.createdAt).toLocaleString("ar-EG")}
                  {m.isAutoReply ? " · رد تلقائي" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* عارض الصورة بالحجم الكامل */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 cursor-zoom-out"
        >
          <button className="absolute top-4 left-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
          <img src={lightbox} alt="عرض" className="max-h-[90vh] max-w-[90vw] rounded-xl" />
          <a
            href={lightbox}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 px-4 py-2 rounded-xl bg-white text-ink-900 text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> فتح/تحميل بالحجم الأصلي
          </a>
        </div>
      )}
    </div>
  );
}
