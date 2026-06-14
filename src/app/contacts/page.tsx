"use client";
import { useEffect, useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

export default function ContactsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const loadContacts = () =>
    fetch("/api/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts || [])).catch(() => {});

  useEffect(() => { loadContacts(); }, []);

  async function doPreview() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("preview", "true");
    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
    const data = await res.json();
    setPreview(data.preview || []);
    setSummary(data.summary || null);
    setBusy(false);
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
    const data = await res.json();
    setSummary(data.summary || null);
    setPreview([]);
    setFile(null);
    await loadContacts();
    setBusy(false);
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">جهات الاتصال</h1>
          <p className="text-ink-800/60 mt-1">استيراد الأرقام من Excel أو CSV مع تطبيع الأرقام المصرية تلقائيًا</p>
        </div>
        <a href="/api/export?type=contacts" className="badge bg-brand-50 text-brand-700 px-4 py-2">
          <Download className="w-4 h-4" /> تصدير Excel
        </a>
      </header>

      {/* رفع الملف */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-500/40 cursor-pointer hover:bg-brand-50 transition">
            <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            <span className="text-sm">{file ? file.name : "اختر ملف .xlsx أو .csv"}</span>
            <input type="file" accept=".xlsx,.xls,.csv" hidden
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={doPreview} disabled={!file || busy}
            className="px-4 py-2.5 rounded-xl bg-ink-900 text-white text-sm disabled:opacity-40">
            معاينة
          </button>
          <button onClick={doImport} disabled={!file || busy}
            className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm flex items-center gap-2 disabled:opacity-40">
            <Upload className="w-4 h-4" /> استيراد وحفظ
          </button>
        </div>

        {summary && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="text-ink-800/70">الإجمالي: <b>{summary.total}</b></span>
            {"inserted" in summary && <span className="text-brand-600">تمت الإضافة: <b>{summary.inserted}</b></span>}
            {"valid" in summary && <span className="text-brand-600">صالح: <b>{summary.valid}</b></span>}
            <span className="text-amber-600">غير صالح: <b>{summary.invalid}</b></span>
            <span className="text-amber-600">مكرر بالملف: <b>{summary.duplicateInFile}</b></span>
            {"duplicateInDb" in summary && <span className="text-amber-600">مكرر بالقاعدة: <b>{summary.duplicateInDb}</b></span>}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <p className="text-xs text-ink-800/60 mb-2">معاينة أول {preview.length} صف:</p>
            <ContactTable rows={preview} />
          </div>
        )}
      </div>

      {/* قائمة جهات الاتصال */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold mb-4">جهات الاتصال المحفوظة</h2>
        {contacts.length ? <ContactTable rows={contacts} /> : <p className="text-sm text-ink-800/50">لا توجد جهات اتصال بعد.</p>}
      </div>
    </div>
  );
}

function ContactTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-ink-800/50 text-right border-b">
          <th className="py-2 font-medium">الاسم</th>
          <th className="py-2 font-medium">الهاتف</th>
          <th className="py-2 font-medium">المدينة</th>
          <th className="py-2 font-medium">المنطقة</th>
          <th className="py-2 font-medium">موافقة</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c, i) => (
          <tr key={i} className="border-b last:border-0 hover:bg-sand/50">
            <td className="py-2.5">{c.name || "—"}</td>
            <td className="py-2.5 font-mono text-xs" dir="ltr">{c.phone}</td>
            <td className="py-2.5">{c.city || "—"}</td>
            <td className="py-2.5">{c.area || "—"}</td>
            <td className="py-2.5">
              <span className={`badge ${c.optIn ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"}`}>
                {c.optIn ? "نعم" : "لا"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
