export const dynamic = "force-dynamic";
/**
 * تفاصيل عقار واحد: بياناته + بيانات العميل (المالك) + رابط المحادثة + صور العقار.
 * صور العقار = الوسائط المرتبطة بالمحادثة التي استُخرج منها العقار.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const pr = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      ownerContact: { select: { id: true, name: true, phone: true } },
      conversation: {
        select: {
          id: true,
          classification: true,
          mediaAssets: {
            orderBy: { createdAt: "asc" },
            select: { id: true, mimeType: true, caption: true },
          },
        },
      },
    },
  });

  if (!pr) return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });

  const images = (pr.conversation?.mediaAssets || [])
    .filter((m) => (m.mimeType || "").startsWith("image/"))
    .map((m) => ({ id: m.id, caption: m.caption }));

  return NextResponse.json({
    id: pr.id,
    city: pr.city,
    area: pr.area,
    propertyType: pr.propertyType,
    unitType: pr.unitType,
    bedrooms: pr.bedrooms,
    bathrooms: pr.bathrooms,
    floor: pr.floor,
    furnishedStatus: pr.furnishedStatus,
    price: pr.price,
    paymentType: pr.paymentType,
    availability: pr.availability,
    isSold: pr.isSold,
    soldAt: pr.soldAt,
    profit: pr.profit,
    notes: pr.notes,
    ownerPhone: pr.ownerPhone,
    createdAt: pr.createdAt,
    owner: pr.ownerContact
      ? { id: pr.ownerContact.id, name: pr.ownerContact.name, phone: pr.ownerContact.phone }
      : null,
    classification: pr.conversation?.classification || null,
    conversationId: pr.conversation?.id || null,
    images,
  });
}

/**
 * تعليم العقار كمُباع أو إلغاء البيع.
 * body: { isSold: boolean, profit?: number }
 *  - عند البيع: نسجّل تاريخ البيع، والمكسب (إن لم يُرسل نستخدم سعر العقار كقيمة افتراضية).
 *  - عند الإلغاء: نُفرّغ تاريخ البيع والمكسب.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const existing = await prisma.property.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "العقار غير موجود" }, { status: 404 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const sold = !!body.isSold;

  // تحويل المكسب لرقم صالح إن وُجد
  const rawProfit = body.profit;
  let profit: number | null = null;
  if (rawProfit !== null && rawProfit !== undefined && String(rawProfit).trim() !== "") {
    const n = parseFloat(String(rawProfit).replace(/[^\d.-]/g, ""));
    profit = Number.isNaN(n) ? null : n;
  }

  const data = sold
    ? {
        isSold: true,
        soldAt: new Date(),
        // إن لم يُحدَّد مكسب، استخدم سعر العقار كقيمة افتراضية (يمكن تعديلها لاحقًا)
        profit: profit ?? existing.price ?? null,
      }
    : { isSold: false, soldAt: null, profit: null };

  const updated = await prisma.property.update({ where: { id: params.id }, data });

  return NextResponse.json({
    ok: true,
    isSold: updated.isSold,
    soldAt: updated.soldAt,
    profit: updated.profit,
  });
}
