export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const area = p.get("area") || undefined;
  const furnished = p.get("furnished") || undefined;
  const minPrice = p.get("minPrice");
  const maxPrice = p.get("maxPrice");
  const bedrooms = p.get("bedrooms");
  // sold=1 ⇒ المعروض هو العقارات المُباعة فقط، غير ذلك ⇒ غير المُباعة فقط
  const onlySold = p.get("sold") === "1";

  const properties = await prisma.property.findMany({
    where: {
      isSold: onlySold,
      area: area ? { contains: area, mode: "insensitive" } : undefined,
      furnishedStatus: furnished ? { contains: furnished } : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      price: {
        gte: minPrice ? Number(minPrice) : undefined,
        lte: maxPrice ? Number(maxPrice) : undefined,
      },
    },
    orderBy: onlySold ? { soldAt: "desc" } : { createdAt: "desc" },
    take: 200,
    include: {
      ownerContact: { select: { name: true, phone: true } },
      conversation: {
        select: { id: true, classification: true, _count: { select: { mediaAssets: true } } },
      },
    },
  });

  // ملخّص المبيعات: إجمالي عدد المُباع وإجمالي المكسب (على كل المُباع، وليس أول 200 فقط)
  const agg = await prisma.property.aggregate({
    where: { isSold: true },
    _count: true,
    _sum: { profit: true },
  });

  return NextResponse.json({
    summary: {
      soldCount: agg._count,
      totalProfit: agg._sum.profit || 0,
    },
    properties: properties.map((pr) => ({
      id: pr.id,
      area: pr.area,
      city: pr.city,
      sizeSqm: pr.sizeSqm,
      propertyType: pr.propertyType,
      bedrooms: pr.bedrooms,
      bathrooms: pr.bathrooms,
      floor: pr.floor,
      furnishedStatus: pr.furnishedStatus,
      finishingStatus: pr.finishingStatus,
      airConditioning: pr.airConditioning,
      kitchen: pr.kitchen,
      garage: pr.garage,
      features: pr.features,
      price: pr.price,
      paymentType: pr.paymentType,
      availability: pr.availability,
      isSold: pr.isSold,
      soldAt: pr.soldAt,
      profit: pr.profit,
      ownerPhone: pr.ownerPhone,
      ownerName: pr.ownerContact?.name || null,
      classification: pr.conversation?.classification || null,
      conversationId: pr.conversation?.id || null,
      mediaCount: pr.conversation?._count.mediaAssets || 0,
    })),
  });
}
