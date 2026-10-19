CREATE TYPE "AccessProfile" AS ENUM ('FREE', 'PREMIUM', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "AccessProfile" NOT NULL DEFAULT 'FREE';

CREATE TABLE "Favorite" (
    "userId" UUID NOT NULL,
    "catalogProductId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "catalogProductId")
);

CREATE INDEX "Favorite_catalogProductId_idx" ON "Favorite"("catalogProductId");
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite"
ADD CONSTRAINT "Favorite_catalogProductId_fkey"
FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
