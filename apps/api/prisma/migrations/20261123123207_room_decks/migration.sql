-- CreateTable
CREATE TABLE "room_decks" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "author_id" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_decks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_decks_room_id_idx" ON "room_decks"("room_id");

-- AddForeignKey
ALTER TABLE "room_decks" ADD CONSTRAINT "room_decks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_decks" ADD CONSTRAINT "room_decks_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
