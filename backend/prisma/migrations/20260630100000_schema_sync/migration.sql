-- Synchronisation du schéma Prisma avec la base de données
-- Ajout de s3Key et suppression de email de la table File

-- Ajout de la colonne s3Key (nullable d'abord pour migrer les données existantes)
ALTER TABLE "File" ADD COLUMN "s3Key" TEXT;

-- Remplir s3Key pour les enregistrements existants à partir du downloadToken
UPDATE "File"
SET "s3Key" = "downloadToken" || '/' || "filename"
WHERE "s3Key" IS NULL;

-- Rendre s3Key NOT NULL et UNIQUE
ALTER TABLE "File" ALTER COLUMN "s3Key" SET NOT NULL;
CREATE UNIQUE INDEX "File_s3Key_key" ON "File"("s3Key");

-- Supprimer la colonne email et son index unique
DROP INDEX IF EXISTS "File_email_key";
ALTER TABLE "File" DROP COLUMN "email";
