"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Image as ImageIcon, Wallet, Building2 } from "lucide-react";
import { toAr } from "@/lib/arabic";

export default function SoldPropertiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ soldCount: number; totalProfit: number }>({
    soldCount: 0,
    totalProfit: 0,
  });
  const [area, setArea] = useState("");

  const load = () => {
    const q = new URLSearchParams();
    q.set("sold", "1");
    if (area) q.set("area", area);
    fetch("/api/properties?" + q.toString())
      .then((r) => r.json())
      .then((d) => {
        setRows(d.properties || []);
        if (d.summary) setSummary(d.summary);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">العقارات المُباعة</h1>
          <p className="text-ink-800/60 mt-1">
            العقارات التي تم بيعها وإجمالي المكسب منها — اضغط على أي عقار للتفاصيل
          </p>
        </div>
        <a
          href="/api/export?type=properties&sold=1"
          className="badge bg-brand-50 text-brand-700 px-4 py-2"
        >
          <Download className="w-4 h-4" /> Excel
        </a>
      </header>

      {/* بطاقات الملخّص */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 grid place-items-center">
            <Wallet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-ink-800/50 text-sm">إجمالي المكسب من المبيعات</div>
            <div className="font-display text-2xl font-extrabold text-emerald-700">
              {Number(summary.totalProfit || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 grid place-items-center">
            <Building2 className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <div className="text-ink-800/50 text-sm">عدد العقارات المُباعة</div>
            <div className="font-display text-2xl font-extrabold text-ink-900">
              {summary.soldCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* فلتر */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        <input
          placeholder="المنطقة"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="px-3 py-2 rounded-xl border border-black/10 outline-none text-sm"
        />
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl bg-ink-900 text-white text-sm flex items-center gap-2"
        >
          <Search className="w-4 h-4" /> بحث
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-ink-800/50 text-center border-b bg-sand/40">
              <th className="py-3 px-4 font-medium text-center">المنطقة</th>
              <th className="py-3 px-4 font-medium text-center">النوع</th>
              <th className="py-3 px-4 font-medium text-center">المساحة</th>
              <th className="py-3 px-4 font-medium text-center">العميل</th>
              <th className="py-3 px-4 font-medium text-center">السعر</th>
              <th className="py-3 px-4 font-medium text-center">المكسب</th>
              <th className="py-3 px-4 font-medium text-center">تاريخ البيع</th>
              <th className="py-3 px-4 font-medium text-center">صور</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-ink-800/40">
                  لا توجد عقارات مُباعة بعد
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/properties/${p.id}`)}
                className="border-b last:border-0 hover:bg-sand/40 text-center cursor-pointer"
              >
                <td className="py-3 px-4 text-center">{toAr(p.area || p.city)}</td>
                <td className="py-3 px-4 text-center">{toAr(p.propertyType)}</td>
                <td className="py-3 px-4 text-center">{p.sizeSqm ? `${p.sizeSqm} م²` : "—"}</td>
                <td className="py-3 px-4 text-center">
                  {p.ownerName || (p.ownerPhone ? p.ownerPhone : "—")}
                </td>
                <td className="py-3 px-4 text-center">
                  {p.price ? p.price.toLocaleString() : "—"}
                </td>
                <td className="py-3 px-4 font-semibold text-center text-emerald-700">
                  {p.profit != null ? Number(p.profit).toLocaleString() : "—"}
                </td>
                <td className="py-3 px-4 text-center">
                  {p.soldAt ? new Date(p.soldAt).toLocaleDateString("ar-EG") : "—"}
                </td>
                <td className="py-3 px-4 text-center">
                  {p.mediaCount > 0 ? (
                    <span className="badge bg-brand-50 text-brand-700 inline-flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" /> {p.mediaCount}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
