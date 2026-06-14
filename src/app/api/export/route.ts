export const dynamic = "force-dynamic";
/**
 * تصدير البيانات إلى Excel.
 * ?type=contacts | properties | leads | followups
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "contacts";
  let rows: any[] = [];
  let filename = "export.xlsx";

  if (type === "contacts") {
    const data = await prisma.contact.findMany();
    rows = data.map((c) => ({
      الاسم: c.name, الهاتف: c.phone, المدينة: c.city, المنطقة: c.area,
      المصدر: c.source, موافقة: c.optIn ? "نعم" : "لا", ملاحظات: c.notes,
    }));
    filename = "contacts.xlsx";
  } else if (type === "properties") {
    const data = await prisma.property.findMany();
    rows = data.map((p) => ({
      المدينة: p.city, المنطقة: p.area, "المساحة م²": p.sizeSqm, النوع: p.propertyType, "الغرف": p.bedrooms,
      "الحمامات": p.bathrooms, الفرش: p.furnishedStatus, "التشطيب": p.finishingStatus,
      "التكييفات": p.airConditioning, "المطبخ": p.kitchen, "الجراج": p.garage, "مميزات إضافية": p.features,
      السعر: p.price,
      "التوفر": p.availability, "هاتف المالك": p.ownerPhone, ملاحظات: p.notes,
    }));
    filename = "properties.xlsx";
  } else if (type === "leads") {
    const data = await prisma.conversation.findMany({ include: { contact: true } });
    rows = data.map((c) => ({
      الاسم: c.contact.name, الهاتف: c.contact.phone, التصنيف: c.classification,
      الحالة: c.status, "الملخص": c.aiSummary,
    }));
    filename = "leads.xlsx";
  } else if (type === "followups") {
    const data = await prisma.followUp.findMany({ include: { contact: true } });
    rows = data.map((f) => ({
      الهاتف: f.contact.phone, "موعد المتابعة": f.dueDate, "الأولوية": f.priority,
      الحالة: f.status, ملاحظات: f.notes,
    }));
    filename = "followups.xlsx";
  }

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "لا بيانات": "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}