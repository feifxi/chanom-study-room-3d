-- DropIndex
DROP INDEX "focus_sessions_ended_at_idx";

-- DropIndex
DROP INDEX "focus_sessions_room_id_ended_at_idx";

-- DropIndex
DROP INDEX "focus_sessions_user_id_ended_at_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "show_on_everyone" BOOLEAN;

-- CreateIndex
CREATE INDEX "focus_sessions_user_id_started_at_idx" ON "focus_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "focus_sessions_room_id_started_at_idx" ON "focus_sessions"("room_id", "started_at");

-- CreateIndex
CREATE INDEX "focus_sessions_started_at_idx" ON "focus_sessions"("started_at");
