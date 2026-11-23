-- CreateTable
CREATE TABLE "owned_items" (
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "bought_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owned_items_pkey" PRIMARY KEY ("user_id","item_id")
);

-- AddForeignKey
ALTER TABLE "owned_items" ADD CONSTRAINT "owned_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
