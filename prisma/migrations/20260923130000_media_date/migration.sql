ALTER TABLE "Media" ADD COLUMN "mediaDate" DATE;

CREATE INDEX "Media_clientId_mediaDate_idx" ON "Media"("clientId", "mediaDate");
