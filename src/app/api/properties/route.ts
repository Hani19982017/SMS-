export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const area = (p.get("area") || "").trim();
  const furnished = (p.get("furnished") || "").trim();
  const minPrice = p.get("minPrice");
  const maxPrice = p.get("maxPrice");
  const bedroomsRaw = (p.get("bedrooms") || "").trim();
  // استخرج رقمًا صحيحًا فقط؛ أي إدخال غير رقمي يُتجاهل بدل أن يُفرِغ النتائج
  const bedroomsDigits = bedroomsRaw.replace(/[^\d]/g, "");
  const bedroomsNum = bedroomsDigits ? parseInt(bedroomsDigits, 10) : NaN;
  // sold=1 ⇒ المعروض هو العقارات المُباعة فقط، غير ذلك ⇒ غير المُباعة فقط
  const onlySold = p.get("sold") === "1";

  // نبني شروط البحث ديناميكيًا (الشروط تُدمج بـ AND فيما بينها)
  const where: any = { isSold: onlySold };

  // «المنطقة»: ابحث في حقل المنطقة أو المدينة معًا، دون حساسية لحالة الأحرف
  if (area) {
    where.OR = [
      { area: { contains: area, mode: "insensitive" } },
      { city: { contains: area, mode: "insensitive" } },
    ];
  }
  // «حالة الفرش»: مطابقة جزئية دون حساسية لحالة الأحرف
  if (furnished) {
    where.furnishedStatus = { contains: furnished, mode: "insensitive" };
  }
  // «عدد الغرف»: مطابقة دقيقة فقط إذا كان الإدخال رقمًا صالحًا
  if (!Number.isNaN(bedroomsNum)) {
    where.bedrooms = bedroomsNum;
  }
  // نطاق السعر (اختياري)
  const priceFilter: any = {};
  if (minPrice && !Number.isNaN(Number(minPrice))) priceFilter.gte = Number(minPrice);
  if (maxPrice && !Number.isNaN(Number(maxPrice))) priceFilter.lte = Number(maxPrice);
  if (Object.keys(priceFilter).length) where.price = priceFilter;

  const properties = await prisma.property.findMany({
    where,
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
