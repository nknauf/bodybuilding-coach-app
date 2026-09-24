CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "uploaderId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "etag" TEXT NOT NULL,
    "caption" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Media_objectKey_key" ON "Media"("objectKey");
CREATE INDEX "Media_clientId_createdAt_idx" ON "Media"("clientId", "createdAt" DESC);
CREATE INDEX "Media_uploaderId_createdAt_idx" ON "Media"("uploaderId", "createdAt");
ALTER TABLE "Media" ADD CONSTRAINT "Media_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
