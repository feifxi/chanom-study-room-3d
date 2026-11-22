-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "dm_id" TEXT;

-- CreateTable
CREATE TABLE "dms" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "last_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_members" (
    "dm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_id" TEXT,

    CONSTRAINT "dm_members_pkey" PRIMARY KEY ("dm_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dms_pair_key" ON "dms"("pair");

-- CreateIndex
CREATE INDEX "dm_members_user_id_idx" ON "dm_members"("user_id");

-- CreateIndex
CREATE INDEX "messages_dm_id_id_idx" ON "messages"("dm_id", "id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_dm_id_fkey" FOREIGN KEY ("dm_id") REFERENCES "dms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_members" ADD CONSTRAINT "dm_members_dm_id_fkey" FOREIGN KEY ("dm_id") REFERENCES "dms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_members" ADD CONSTRAINT "dm_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
