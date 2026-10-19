CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.rotulai_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $function$
  SELECT public.unaccent('public.unaccent'::regdictionary, value);
$function$;

CREATE TABLE "CatalogSearchSynonym" (
    "id" UUID NOT NULL,
    "phrase" VARCHAR(120) NOT NULL,
    "normalizedPhrase" VARCHAR(120) NOT NULL,
    "expansions" TEXT[] NOT NULL,
    "category" "ProductCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSearchSynonym_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogSearchSynonym_normalizedPhrase_key" ON "CatalogSearchSynonym"("normalizedPhrase");
CREATE INDEX "CatalogSearchSynonym_category_idx" ON "CatalogSearchSynonym"("category");

CREATE INDEX "CatalogProduct_name_trgm_idx"
ON "CatalogProduct" USING GIN (public.rotulai_unaccent(lower("name")) gin_trgm_ops);

CREATE INDEX "CatalogProduct_brand_trgm_idx"
ON "CatalogProduct" USING GIN (public.rotulai_unaccent(lower("brand")) gin_trgm_ops);

CREATE INDEX "Ingredient_name_trgm_idx"
ON "Ingredient" USING GIN (public.rotulai_unaccent(lower("name")) gin_trgm_ops);
