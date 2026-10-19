-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "referenceUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProductIngredient" (
    "catalogProductId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CatalogProductIngredient_pkey" PRIMARY KEY ("catalogProductId","ingredientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_slug_key" ON "CatalogProduct"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_brand_name_key" ON "CatalogProduct"("brand","name");

-- CreateIndex
CREATE INDEX "CatalogProduct_category_name_idx" ON "CatalogProduct"("category","name");

-- CreateIndex
CREATE INDEX "CatalogProduct_brand_name_idx" ON "CatalogProduct"("brand","name");

-- CreateIndex
CREATE INDEX "CatalogProductIngredient_ingredientId_idx" ON "CatalogProductIngredient"("ingredientId");

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
