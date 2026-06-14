-- إضافة حقل المساحة بالمتر المربع للعقار (منفصل عن حقل المنطقة/المكان)
ALTER TABLE "Property" ADD COLUMN "sizeSqm" DOUBLE PRECISION;
