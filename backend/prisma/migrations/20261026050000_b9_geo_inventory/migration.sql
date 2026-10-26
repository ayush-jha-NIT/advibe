-- B9 curated cities, circular admin zones and published location inventory.
-- PostgreSQL built-in point GiST index; no PostGIS/extension dependency.
CREATE TYPE "CatalogState" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');
CREATE TABLE "City" (
  "id" UUID NOT NULL, "slug" VARCHAR(100) NOT NULL, "name" VARCHAR(120) NOT NULL,
  "countryCode" CHAR(2) NOT NULL, "timeZone" VARCHAR(100) NOT NULL,
  "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "City_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "City_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "City_countryCode_check" CHECK ("countryCode" ~ '^[A-Z]{2}$'),
  CONSTRAINT "City_name_check" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");
CREATE INDEX "City_state_name_id_idx" ON "City"("state","name","id");
CREATE TABLE "Zone" (
  "id" UUID NOT NULL, "cityId" UUID NOT NULL, "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(120) NOT NULL, "centerLat" DOUBLE PRECISION NOT NULL,
  "centerLng" DOUBLE PRECISION NOT NULL, "radiusMeters" INTEGER NOT NULL,
  "state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Zone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Zone_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Zone_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "Zone_center_check" CHECK ("centerLat" BETWEEN -90 AND 90 AND "centerLng" BETWEEN -180 AND 180),
  CONSTRAINT "Zone_radius_check" CHECK ("radiusMeters" BETWEEN 100 AND 50000),
  CONSTRAINT "Zone_name_check" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "Zone_cityId_slug_key" ON "Zone"("cityId","slug");
CREATE INDEX "Zone_cityId_state_name_id_idx" ON "Zone"("cityId","state","name","id");
CREATE TABLE "Location" (
  "id" UUID NOT NULL,"zoneId" UUID NOT NULL,"slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(160) NOT NULL,"latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,"state" "CatalogState" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Location_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "Location_coords_check" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180),
  CONSTRAINT "Location_name_check" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "Location_zoneId_slug_key" ON "Location"("zoneId","slug");
CREATE INDEX "Location_zoneId_state_id_idx" ON "Location"("zoneId","state","id");
CREATE INDEX "Location_state_id_idx" ON "Location"("state","id");
-- point(longitude,latitude) uses PostgreSQL's built-in geometric GiST opclass.
CREATE INDEX "Location_lonlat_gist_idx" ON "Location" USING GIST ((point("longitude","latitude")));
ALTER TABLE "Screen" ADD COLUMN "locationId" UUID;
ALTER TABLE "Screen" ADD CONSTRAINT "Screen_locationId_fkey" FOREIGN KEY ("locationId")
  REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Screen_locationId_state_idx" ON "Screen"("locationId","state");
