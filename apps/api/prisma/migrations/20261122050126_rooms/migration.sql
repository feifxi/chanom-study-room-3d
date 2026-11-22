-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('private', 'request', 'open');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('owner', 'mod', 'member');

-- CreateEnum
CREATE TYPE "InviteKind" AS ENUM ('member', 'guest');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "map_id" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'cosy',
    "time" TEXT NOT NULL DEFAULT 'clock',
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "capacity" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "rules" TEXT NOT NULL,
    "show_rules" BOOLEAN NOT NULL DEFAULT true,
    "filter_words" BOOLEAN NOT NULL DEFAULT true,
    "slow_mode" BOOLEAN NOT NULL DEFAULT false,
    "new_member_wait" BOOLEAN NOT NULL DEFAULT false,
    "room_wide_games" BOOLEAN NOT NULL DEFAULT true,
    "members_can_invite" BOOLEAN NOT NULL DEFAULT true,
    "allow_guests" BOOLEAN NOT NULL DEFAULT true,
    "guest_voice" BOOLEAN NOT NULL DEFAULT false,
    "heir_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "RoomRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visited_at" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "notify" TEXT NOT NULL DEFAULT 'mentions',
    "timed_out_until" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "join_requests" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declined_at" TIMESTAMP(3),

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "room_bans" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "by_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_bans_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "invites" (
    "code" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "kind" "InviteKind" NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "expiry" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "guest_visits" (
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_visits_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateIndex
CREATE INDEX "rooms_visibility_idx" ON "rooms"("visibility");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "invites_room_id_idx" ON "invites"("room_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bans" ADD CONSTRAINT "room_bans_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bans" ADD CONSTRAINT "room_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_visits" ADD CONSTRAINT "guest_visits_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_visits" ADD CONSTRAINT "guest_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
