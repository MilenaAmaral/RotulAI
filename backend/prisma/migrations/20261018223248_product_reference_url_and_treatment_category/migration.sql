-- AlterEnum
ALTER TYPE "ProductCategory" ADD VALUE 'TRATAMENTO';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "referenceUrl" VARCHAR(500);
