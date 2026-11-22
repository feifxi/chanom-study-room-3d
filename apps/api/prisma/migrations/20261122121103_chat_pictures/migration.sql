/*
  Warnings:

  - Added the required column `uploader_id` to the `pictures` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "ready" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "pictures" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'uploading',
ADD COLUMN     "uploader_id" TEXT NOT NULL,
ALTER COLUMN "message_id" DROP NOT NULL,
ALTER COLUMN "key" DROP NOT NULL,
ALTER COLUMN "width" SET DEFAULT 0,
ALTER COLUMN "height" SET DEFAULT 0,
ALTER COLUMN "bytes" SET DEFAULT 0,
ALTER COLUMN "position" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "pictures_uploader_id_created_at_idx" ON "pictures"("uploader_id", "created_at");

-- AddForeignKey
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
