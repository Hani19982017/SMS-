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

  const properties = await prisma.property.findMany({
    where: {
      area: area ? { contains: area, mode: "insensitive" } : undefined,
      furnishedStatus: furnished ? { contains: furnished } : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      price: {
        gte: minPrice ? Number(minPrice) : undefined,
        lte: maxPrice ? Number(maxPrice) : undefined,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      ownerContact: { select: { name: true, phone: true } },
      conversation: {
        select: { id: true, classification: true, _count: { select: { mediaAssets: true } } },
      },
    },
  });

  return NextResponse.json({
    properties: properties.map((pr) => ({
      id: pr.id,
      area: pr.area,
      city: pr.city,
      propertyType: pr.propertyType,
      bedrooms: pr.bedrooms,
      furnishedStatus: pr.furnishedStatus,
      price: pr.price,
      paymentType: pr.paymentType,
      availability: pr.availability,
      ownerPhone: pr.ownerPhone,
      ownerName: pr.ownerContact?.name || null,
      classification: pr.conversation?.classification || null,
      conversationId: pr.conversation?.id || null,
      mediaCount: pr.conversation?._count.mediaAssets || 0,
    })),
  });
}
