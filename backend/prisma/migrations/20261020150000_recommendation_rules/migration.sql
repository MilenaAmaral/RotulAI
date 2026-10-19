CREATE TYPE "SkinType" AS ENUM ('OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL');
CREATE TYPE "SkinConcern" AS ENUM ('ACNE_PRONE', 'PIGMENTATION', 'DEHYDRATION', 'SENSITIVITY', 'SUN_PROTECTION');

CREATE TABLE "RecommendationRule" (
    "id" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "skinType" "SkinType" NOT NULL,
    "concern" "SkinConcern" NOT NULL,
    "rationale" VARCHAR(500) NOT NULL,
    "justification" VARCHAR(1200) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecommendationRule_ingredientId_skinType_concern_key"
ON "RecommendationRule"("ingredientId", "skinType", "concern");

CREATE INDEX "RecommendationRule_skinType_concern_isActive_idx"
ON "RecommendationRule"("skinType", "concern", "isActive");

ALTER TABLE "RecommendationRule"
ADD CONSTRAINT "RecommendationRule_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
