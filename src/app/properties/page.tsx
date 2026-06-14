"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Image as ImageIcon, FolderDown } from "lucide-react";
import { toAr } from "@/lib/arabic";

function clientKind(cls: string | null) {
  if (cls === "Property Owner" || cls === "Broker")
    return { ar: "بائع", cls: "bg-emerald-50 text-emerald-700" };
  if (cls === "Interested Buyer or Tenant")
    return { ar: "مشتري", cls: "bg-blue-50 text-blue-700" };
  return { ar: "—", cls: "bg-gray-100 text-gray-500" };
}

export default function PropertiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [furnished, setFurnished] = useState("");

  const load = () => {
    const q = new URLSearchParams();
    if (area) q.set("area", area);
    if (bedrooms) q.set("bedrooms", bedrooms);
    if (furnished) q.set("furnished", furnished);
    fetch("/api/properties?" + q.toString())
      .then((r) => r.json())
      .then((d) => setRows(d.properties || []))
      .catch(() => {});
  };
  useEffect(load, []);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">العقارات</h1>
          <p className="text-ink-800/60 mt-1">العقارات المستخرجة تلقائيًا من المحادثات — اضغط على أي عقار للتفاصيل</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/properties/export-zip" className="badge bg-brand-500 text-white px-4 py-2">
            <FolderDown className="w-4 h-4" /> تحميل الكل بالصور
          </a>
          <a href="/api/export?type=properties" className="badge bg-brand-50 text-brand-700 px-4 py-2">
            <Download className="w-4 h-4" /> Excel
          </a>
        </div>
      </header>

      {/* فلاتر البحث */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        <input placeholder="المنطقة" value={area} onChange={(e) => setArea(e.target.value)}
          className="px-3 py-2 rounded-xl border border-black/10 outline-none text-sm" />
        <input placeholder="عدد الغرف" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}
          className="w-28 px-3 py-2 rounded-xl border border-black/10 outline-none text-sm" />
        <input placeholder="حالة الفرش" value={furnished} onChange={(e) => setFurnished(e.target.value)}
          className="px-3 py-2 rounded-xl border border-black/10 outline-none text-sm" />
        <button onClick={load} className="px-4 py-2 rounded-xl bg-ink-900 text-white text-sm flex items-center gap-2">
          <Search className="w-4 h-4" /> بحث
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-800/50 text-center border-b bg-sand/40">
              <th className="py-3 px-4 font-medium text-center">المنطقة</th>
              <th className="py-3 px-4 font-medium text-center">المساحة</th>
              <th className="py-3 px-4 font-medium text-center">النوع</th>
              <th className="py-3 px-4 font-medium text-center">العميل</th>
              <th className="py-3 px-4 font-medium text-center">بائع/مشتري</th>
              <th className="py-3 px-4 font-medium text-center">الغرف</th>
              <th className="py-3 px-4 font-medium text-center">السعر</th>
              <th className="py-3 px-4 font-medium text-center">التوفر</th>
              <th className="py-3 px-4 font-medium text-center">صور</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-ink-800/40">لا توجد عقارات بعد</td></tr>
            )}
            {rows.map((p) => {
              const kind = clientKind(p.classification);
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/properties/${p.id}`)}
                  className="border-b last:border-0 hover:bg-sand/40 text-center cursor-pointer"
                >
                  <td className="py-3 px-4 text-center">{toAr(p.area || p.city)}</td>
                  <td className="py-3 px-4 text-center">{p.sizeSqm ? `${p.sizeSqm} م²` : "—"}</td>
                  <td className="py-3 px-4 text-center">{toAr(p.propertyType)}</td>
                  <td className="py-3 px-4 text-center">{p.ownerName || (p.ownerPhone ? p.ownerPhone : "—")}</td>
                  <td className="py-3 px-4 text-center"><span className={`badge ${kind.cls}`}>{kind.ar}</span></td>
                  <td className="py-3 px-4 text-center">{p.bedrooms ?? "—"}</td>
                  <td className="py-3 px-4 font-semibold text-center">{p.price ? p.price.toLocaleString() : "—"}</td>
                  <td className="py-3 px-4 text-center">{toAr(p.availability)}</td>
                  <td className="py-3 px-4 text-center">
                    {p.mediaCount > 0 ? (
                      <span className="badge bg-brand-50 text-brand-700 inline-flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {p.mediaCount}
                      </span>
                    ) : "—"}
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
