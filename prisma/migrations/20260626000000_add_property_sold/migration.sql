-- AlterTable: إضافة حقول تتبّع بيع العقار
ALTER TABLE "Property" ADD COLUMN "isSold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Property" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "profit" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Property_isSold_idx" ON "Property"("isSold");
