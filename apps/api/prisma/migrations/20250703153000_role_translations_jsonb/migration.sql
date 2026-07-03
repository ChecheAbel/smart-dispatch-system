-- Add JSONB translations column
ALTER TABLE "roles" ADD COLUMN "translations" JSONB;

-- Migrate from role_translations table when present
UPDATE "roles" r
SET "translations" = COALESCE(
  (
    SELECT jsonb_object_agg(
      rt.locale,
      jsonb_build_object(
        'name', rt.name,
        'description', rt.description
      )
    )
    FROM "role_translations" rt
    WHERE rt.role_id = r.id
  ),
  '{}'::jsonb
);

-- Fallback for databases that never had role_translations
UPDATE "roles"
SET "translations" = '{}'::jsonb
WHERE "translations" IS NULL;

ALTER TABLE "roles" ALTER COLUMN "translations" SET NOT NULL;
ALTER TABLE "roles" ALTER COLUMN "translations" SET DEFAULT '{}'::jsonb;

DROP TABLE IF EXISTS "role_translations";
