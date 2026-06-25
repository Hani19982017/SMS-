"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageSquare, Phone, Download, X, BadgeCheck, RotateCcw } from "lucide-react";
import { toAr } from "@/lib/arabic";

function clientKind(cls: string | null) {
  if (cls === "Property Owner" || cls === "Broker")
    return { ar: "بائع / عارض", cls: "bg-emerald-50 text-emerald-700" };
  if (cls === "Interested Buyer or Tenant")
    return { ar: "مشتري / مستأجر", cls: "bg-blue-50 text-blue-700" };
  return { ar: "غير محدد", cls: "bg-gray-100 text-gray-500" };
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-black/5 last:border-0">
      <span className="text-ink-800/50 text-sm">{label}</span>
      <span className="font-medium text-sm text-ink-900">{value ?? "—"}</span>
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<any>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSold, setEditingSold] = useState(false);
  const [profitInput, setProfitInput] = useState("");

  async function setSold(isSold: boolean, profit?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSold, profit }),
      });
      const d = await res.json();
      if (d.ok) {
        setPr((prev: any) => ({ ...prev, isSold: d.isSold, soldAt: d.soldAt, profit: d.profit }));
        setEditingSold(false);
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    fetch(`/api/properties/${id}`).then((r) => r.json()).then(setPr).catch(() => {});
  }, [id]);

  if (!pr) return <p className="text-ink-800/50">جارٍ التحميل…</p>;
  if (pr.error) return <p className="text-ink-800/50">{pr.error}</p>;
  const kind = clientKind(pr.classification);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="p-2 rounded-lg hover:bg-black/5">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">
              {toAr(pr.propertyType)} — {toAr(pr.area || pr.city)}
            </h1>
            <span className={`badge ${kind.cls} mt-1 inline-block`}>{kind.ar}</span>
            {pr.isSold && (
              <span className="badge bg-emerald-600 text-white mt-1 mr-2 inline-block">تم البيع</span>
            )}
          </div>
        </div>
        <a href={`/api/properties/export-zip`} className="badge bg-brand-50 text-brand-700 px-4 py-2">
          <Download className="w-4 h-4" /> تحميل الكل
        </a>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {/* بيانات العقار */}
        <div className="card p-5">
          <h2 className="font-bold text-ink-900 mb-2">بيانات العقار</h2>
          <Row label="النوع" value={toAr(pr.propertyType)} />
          <Row label="المنطقة" value={toAr(pr.area)} />
          <Row label="المساحة" value={pr.sizeSqm ? `${pr.sizeSqm} م²` : "—"} />
          <Row label="المدينة" value={toAr(pr.city)} />
          <Row label="عدد الغرف" value={pr.bedrooms} />
          <Row label="الحمامات" value={pr.bathrooms} />
          <Row label="الدور" value={pr.floor} />
          <Row label="الفرش" value={toAr(pr.furnishedStatus)} />
          <Row label="حالة التشطيب" value={toAr(pr.finishingStatus)} />
          <Row label="التكييفات" value={toAr(pr.airConditioning)} />
          <Row label="المطبخ" value={toAr(pr.kitchen)} />
          <Row label="الجراج" value={toAr(pr.garage)} />
          <Row label="السعر" value={pr.price ? pr.price.toLocaleString() : "—"} />
          <Row label="نوع التعامل" value={toAr(pr.paymentType)} />
          <Row label="التوفر" value={toAr(pr.availability)} />
          {pr.features && <Row label="مميزات إضافية" value={pr.features} />}
          {pr.notes && <Row label="ملاحظات" value={pr.notes} />}
        </div>

        {/* بيانات العميل */}
        <div className="card p-5 h-fit">
          <h2 className="font-bold text-ink-900 mb-2">العميل</h2>
          <Row label="الاسم" value={pr.owner?.name || "بدون اسم"} />
          <Row label="نوع العميل" value={kind.ar} />
          <div className="flex justify-between gap-4 py-2.5 border-b border-black/5">
            <span className="text-ink-800/50 text-sm">الهاتف</span>
            <span className="font-mono text-sm" dir="ltr">{pr.ownerPhone || pr.owner?.phone || "—"}</span>
          </div>
          <div className="flex gap-2 mt-4">
            {pr.conversationId && (
              <Link
                href={`/conversations/${pr.conversationId}`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> فتح المحادثة
              </Link>
            )}
            {(pr.ownerPhone || pr.owner?.phone) && (
              <a
                href={`https://wa.me/${(pr.ownerPhone || pr.owner?.phone || "").replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-ink-900 text-white text-sm flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> واتساب
              </a>
            )}
          </div>
        </div>
      </div>

      {/* حالة البيع */}
      <div className="card p-5 mt-4">
        <h2 className="font-bold text-ink-900 mb-3">حالة البيع</h2>
        {pr.isSold ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="badge bg-emerald-600 text-white">تم البيع</span>
              <span className="text-ink-800/60">
                تاريخ البيع:{" "}
                <b className="text-ink-900">
                  {pr.soldAt ? new Date(pr.soldAt).toLocaleDateString("ar-EG") : "—"}
                </b>
              </span>
              <span className="text-ink-800/60">
                المكسب:{" "}
                <b className="text-ink-900">
                  {pr.profit != null ? Number(pr.profit).toLocaleString() : "—"}
                </b>
              </span>
            </div>
            <button
              disabled={saving}
              onClick={() => setSold(false)}
              className="px-4 py-2 rounded-xl bg-black/5 text-ink-900 text-sm flex items-center gap-2 hover:bg-black/10 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> إلغاء البيع
            </button>
          </div>
        ) : editingSold ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-ink-800/50 mb-1">المكسب / العمولة من الصفقة</label>
              <input
                autoFocus
                type="number"
                value={profitInput}
                onChange={(e) => setProfitInput(e.target.value)}
                placeholder={pr.price ? String(pr.price) : "0"}
                className="w-48 px-3 py-2 rounded-xl border border-black/10 outline-none text-sm"
              />
            </div>
            <button
              disabled={saving}
              onClick={() => setSold(true, profitInput)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <BadgeCheck className="w-4 h-4" /> تأكيد البيع
            </button>
            <button
              disabled={saving}
              onClick={() => setEditingSold(false)}
              className="px-4 py-2 rounded-xl bg-black/5 text-ink-900 text-sm"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-800/50">هذا العقار معروض حاليًا ولم يُبَع بعد.</p>
            <button
              onClick={() => {
                setProfitInput(pr.price ? String(pr.price) : "");
                setEditingSold(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-2"
            >
              <BadgeCheck className="w-4 h-4" /> تعليم كمُباع
            </button>
          </div>
        )}
      </div>

      {/* صور العقار */}
      <div className="card p-5 mt-4">
        <h2 className="font-bold text-ink-900 mb-3">صور العقار ({pr.images.length})</h2>
        {pr.images.length === 0 ? (
          <p className="text-sm text-ink-800/40">لا توجد صور لهذا العقار.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {pr.images.map((img: any) => (
              <img
                key={img.id}
                src={`/api/media/${img.id}`}
                alt={img.caption || "صورة العقار"}
                onClick={() => setLightbox(`/api/media/${img.id}`)}
                className="w-40 h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 border border-black/10"
              />
            ))}
          </div>
        )}
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
