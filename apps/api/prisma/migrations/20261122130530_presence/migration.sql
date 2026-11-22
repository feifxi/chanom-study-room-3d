-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "card" JSONB,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'text';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "appear_offline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_seen_at" TIMESTAMP(3),
ADD COLUMN     "show_activity" BOOLEAN NOT NULL DEFAULT true;
