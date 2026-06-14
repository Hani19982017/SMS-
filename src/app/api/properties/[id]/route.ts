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
