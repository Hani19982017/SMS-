export const dynamic = "force-dynamic";
/**
 * تنزيل كل العقارات بصورها كملف مضغوط (ZIP).
 * كل عقار في فولدر مستقل يحوي: ملف «بيانات.txt» + صور العقار.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAr } from "@/lib/arabic";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientKind(cls: string | null): string {
  if (cls === "Property Owner" || cls === "Broker") return "بائع / عارض";
  if (cls === "Interested Buyer or Tenant") return "مشتري / مستأجر";
  return "غير محدد";
}

function extFor(mime?: string | null): string {
  if (!mime) return "bin";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "bin";
}

// إزالة المحارف التي قد تكسر أسماء الملفات/الفولدرات
function safe(s: string): string {
  return (s || "").replace(/[\/\\:*?"<>|]/g, "_").trim().slice(0, 40);
}

export async function GET() {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      ownerContact: { select: { name: true, phone: true } },
      conversation: {
        select: {
          classification: true,
          mediaAssets: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const zip = new JSZip();

  properties.forEach((pr, idx) => {
    const typeAr = toAr(pr.propertyType);
    const areaAr = toAr(pr.area || pr.city);
    const folderName = safe(`${idx + 1}_${typeAr}_${areaAr}_${pr.id.slice(-5)}`);
    const folder = zip.folder(folderName)!;

    const lines = [
      `العقار رقم: ${idx + 1}`,
      `النوع: ${toAr(pr.propertyType)}`,
      `المنطقة: ${toAr(pr.area)}`,
      `المدينة: ${toAr(pr.city)}`,
      `عدد الغرف: ${pr.bedrooms ?? "—"}`,
      `الحمامات: ${pr.bathrooms ?? "—"}`,
      `الدور: ${pr.floor ?? "—"}`,
      `الفرش: ${toAr(pr.furnishedStatus)}`,
      `السعر: ${pr.price ? pr.price.toLocaleString() : "—"}`,
      `نوع التعامل: ${toAr(pr.paymentType)}`,
      `التوفر: ${toAr(pr.availability)}`,
      `نوع العميل: ${clientKind(pr.conversation?.classification || null)}`,
      `اسم العميل: ${pr.ownerContact?.name || "—"}`,
      `هاتف العميل: ${pr.ownerPhone || pr.ownerContact?.phone || "—"}`,
      `ملاحظات: ${pr.notes || "—"}`,
      `التاريخ: ${new Date(pr.createdAt).toLocaleString("ar-EG")}`,
    ];
    folder.file("بيانات.txt", "\uFEFF" + lines.join("\n")); // BOM لعرض العربية صحيحًا

    const media = pr.conversation?.mediaAssets || [];
    let i = 1;
    for (const m of media) {
      if (!(m.mimeType || "").startsWith("image/")) continue;
      folder.file(`صورة-${i}.${extFor(m.mimeType)}`, Buffer.from(m.data as unknown as Buffer));
      i++;
    }
  });

  const base64 = await zip.generateAsync({ type: "base64" });
  const today = new Date().toISOString().slice(0, 10);

  // بناء ArrayBuffer جديد ونسخ البايتات إليه (يتوافق مع التحقق الصارم للأنواع في Node 24)
  const binary = Buffer.from(base64, "base64");
  const arrayBuffer = new ArrayBuffer(binary.byteLength);
  new Uint8Array(arrayBuffer).set(binary);

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="properties-${today}.zip"`,
    },
  });
}
