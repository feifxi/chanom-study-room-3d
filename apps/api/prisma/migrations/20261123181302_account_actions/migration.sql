-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banned_at" TIMESTAMP(3),
ADD COLUMN     "suspended_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "account_actions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "by_id" TEXT,
    "action" TEXT NOT NULL,
    "target_kind" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_actions_user_id_created_at_idx" ON "account_actions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_kind_target_id_idx" ON "audit_log"("target_kind", "target_id");

-- AddForeignKey
ALTER TABLE "account_actions" ADD CONSTRAINT "account_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
