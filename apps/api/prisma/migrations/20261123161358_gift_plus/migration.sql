-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN     "gift_months" INTEGER,
ADD COLUMN     "gift_note" TEXT,
ADD COLUMN     "gift_to_id" TEXT;

-- CreateIndex
CREATE INDEX "checkouts_user_id_gift_to_id_idx" ON "checkouts"("user_id", "gift_to_id");

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_gift_to_id_fkey" FOREIGN KEY ("gift_to_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
