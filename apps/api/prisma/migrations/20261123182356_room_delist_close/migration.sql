-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "delisted_at" TIMESTAMP(3);
