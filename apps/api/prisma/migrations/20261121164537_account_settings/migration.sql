-- AlterTable
ALTER TABLE "users" ADD COLUMN     "delete_at" TIMESTAMP(3),
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "handle_holds" (
    "handle" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handle_holds_pkey" PRIMARY KEY ("handle")
);

-- CreateIndex
CREATE INDEX "handle_holds_user_id_idx" ON "handle_holds"("user_id");

-- CreateIndex
CREATE INDEX "users_delete_at_idx" ON "users"("delete_at");

-- AddForeignKey
ALTER TABLE "handle_holds" ADD CONSTRAINT "handle_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
