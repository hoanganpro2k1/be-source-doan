/*
  Warnings:

  - Added the required column `name` to the `Category` table without a default value. This is not possible if the table is not empty.

*/
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_languageId_unique"
ON "CategoryTranslation" ("categoryId", "languageId")
WHERE "deletedAt" IS NULL;-- This is an empty migration.