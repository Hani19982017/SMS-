/**
 * استيراد جهات الاتصال من ملف Excel (.xlsx) أو CSV.
 * - يقبل أعمدة: name, phone, city, area, source, notes, optin
 *   (أو العربية: الاسم، الهاتف، المدينة، المنطقة، المصدر، ملاحظات، موافقة)
 * - يطبّع الأرقام المصرية إلى صيغة دولية E.164.
 * - يمنع التكرار (داخل الملف ومع قاعدة البيانات).
 * - يُرجع ملخصًا: تمت الإضافة / مكرر / غير صالح.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// خريطة أسماء الأعمدة (عربي/إنجليزي) -> الحقل الموحّد
const FIELD_MAP: Record<string, string> = {
  name: "name", الاسم: "name", "اسم": "name",
  phone: "phone", mobile: "phone", الهاتف: "phone", "رقم": "phone", "موبايل": "phone",
  city: "city", المدينة: "city", "مدينه": "city",
  area: "area", المنطقة: "area", "منطقه": "area",
  source: "source", المصدر: "source",
  notes: "notes", ملاحظات: "notes",
  optin: "optin", "موافقة": "optin", "موافق": "optin",
};

function mapRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = FIELD_MAP[String(k).trim().toLowerCase()];
    if (key) out[key] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

function truthy(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "نعم", "موافق", "on", "y"].includes(s);
}

export async function POST(req: NextRequest) {
  // التحقق من الصلاحية: المدير فقط يستورد
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const preview = form.get("preview") === "true"; // معاينة بدون حفظ
  if (!file) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });

  // قراءة الملف بحسب نوعه
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, any>[] = [];

  try {
    if (file.name.toLowerCase().endsWith(".csv")) {
      const parsed = Papa.parse(buf.toString("utf-8"), {
        header: true,
        skipEmptyLines: true,
      });
      rows = parsed.data as Record<string, any>[];
    } else {
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }
  } catch {
    return NextResponse.json({ error: "تعذّرت قراءة الملف" }, { status: 400 });
  }

  const seen = new Set<string>();
  const valid: any[] = [];
  let invalid = 0;
  let duplicateInFile = 0;

  for (const raw of rows) {
    const r = mapRow(raw);
    if (!r.phone) {
      invalid++;
      continue;
    }
    const norm = normalizePhone(String(r.phone));
    if (!norm.ok) {
      invalid++;
      continue;
    }
    if (seen.has(norm.e164)) {
      duplicateInFile++;
      continue;
    }
    seen.add(norm.e164);
    valid.push({
      name: r.name || null,
      phone: norm.e164,
      rawPhone: String(r.phone),
      city: r.city || null,
      area: r.area || null,
      source: r.source || "import",
      notes: r.notes || null,
      optIn: truthy(r.optin),
      optInDate: truthy(r.optin) ? new Date() : null,
    });
  }

  // المعاينة: نعرض أول 20 صفًّا فقط دون حفظ
  if (preview) {
    return NextResponse.json({
      preview: valid.slice(0, 20),
      summary: { total: rows.length, valid: valid.length, invalid, duplicateInFile },
    });
  }

  // الحفظ مع منع التكرار مقابل قاعدة البيانات
  let inserted = 0;
  let duplicateInDb = 0;
  for (const c of valid) {
    try {
      await prisma.contact.create({ data: c });
      inserted++;
    } catch (e: any) {
      // P2002 = انتهاك قيد الفريدة (رقم موجود مسبقًا)
      if (e.code === "P2002") duplicateInDb++;
      else throw e;
    }
  }

  return NextResponse.json({
    summary: {
      total: rows.length,
      inserted,
      invalid,
      duplicateInFile,
      duplicateInDb,
    },
  });
}
