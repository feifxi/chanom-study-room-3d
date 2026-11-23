-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "blocked_words" (
    "word" TEXT NOT NULL,
    "added_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_words_pkey" PRIMARY KEY ("word")
);

-- The word list that was in the code until the admin site could edit it (feature 14)
INSERT INTO "blocked_words" ("word") VALUES
  ('เหี้ย'), ('ควย'), ('เย็ด'), ('สัส'), ('ระยำ'), ('ส้นตีน'), ('ชาติหมา'), ('อีดอก'), ('อีตอแหล'), ('กะหรี่'), ('แตด')
ON CONFLICT DO NOTHING;
