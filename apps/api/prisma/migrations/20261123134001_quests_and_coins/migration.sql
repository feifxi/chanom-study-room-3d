-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "quest_progress" (
    "user_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "quest_id" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("user_id","day","quest_id")
);

-- CreateTable
CREATE TABLE "coin_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quest_progress_day_idx" ON "quest_progress"("day");

-- CreateIndex
CREATE INDEX "coin_entries_user_id_created_at_idx" ON "coin_entries"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_entries" ADD CONSTRAINT "coin_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
