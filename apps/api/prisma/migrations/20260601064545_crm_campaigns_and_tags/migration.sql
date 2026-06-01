-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "CampaignSegment" AS ENUM ('ALL', 'NEW', 'REGULAR', 'VIP', 'AT_RISK', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "CampaignChannel" NOT NULL,
    "targetSegment" "CampaignSegment" NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_restaurantId_status_idx" ON "Campaign"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Campaign_restaurantId_createdAt_idx" ON "Campaign"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignLog_campaignId_idx" ON "CampaignLog"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLog_customerId_idx" ON "CampaignLog"("customerId");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_active_lastVisitAt_idx" ON "Customer"("restaurantId", "active", "lastVisitAt");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_totalOrders_idx" ON "Customer"("restaurantId", "totalOrders");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_totalSpend_idx" ON "Customer"("restaurantId", "totalSpend");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
