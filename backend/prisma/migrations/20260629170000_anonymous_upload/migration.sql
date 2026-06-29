-- AlterTable
ALTER TABLE "File" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "File" ADD COLUMN "downloadToken" TEXT;

UPDATE "File"
SET "downloadToken" = md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "downloadToken" IS NULL;

ALTER TABLE "File" ALTER COLUMN "downloadToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "File_downloadToken_key" ON "File"("downloadToken");