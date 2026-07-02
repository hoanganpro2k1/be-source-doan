/*
  Warnings:

  - Added the required column `name` to the `Brand` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE UNIQUE INDEX "BrandTranslation_brandId_languageId_unique"
ON "BrandTranslation" ("brandId", "languageId")
WHERE "deletedAt" IS NULL;