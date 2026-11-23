-- AlterTable
ALTER TABLE "users" ADD COLUMN     "time_zone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "room_id" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "focus_sessions_user_id_ended_at_idx" ON "focus_sessions"("user_id", "ended_at");

-- CreateIndex
CREATE INDEX "focus_sessions_room_id_ended_at_idx" ON "focus_sessions"("room_id", "ended_at");

-- CreateIndex
CREATE INDEX "focus_sessions_ended_at_idx" ON "focus_sessions"("ended_at");

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
