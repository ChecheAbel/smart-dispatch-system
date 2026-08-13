-- Nest fleet reference menus under a Setup subgroup so the sidebar stays shorter.
INSERT INTO "menus" ("id", "slug", "path", "icon", "parent_id", "sort_order", "translations", "is_active", "created_at")
SELECT
  gen_random_uuid(),
  'fleet-setup',
  NULL,
  'layers',
  parent.id,
  40,
  '{"en":{"label":"Setup"},"am":{"label":"ማዋቀር"}}'::jsonb,
  true,
  NOW()
FROM "menus" parent
WHERE parent.slug = 'fleet'
  AND NOT EXISTS (SELECT 1 FROM "menus" WHERE slug = 'fleet-setup');

UPDATE "menus" AS child
SET
  "parent_id" = setup.id,
  "sort_order" = CASE child.slug
    WHEN 'vehicle-types' THEN 10
    WHEN 'vehicle-classes' THEN 20
    WHEN 'maintenance-work-types' THEN 30
  END
FROM "menus" AS setup
WHERE setup.slug = 'fleet-setup'
  AND child.slug IN ('vehicle-types', 'vehicle-classes', 'maintenance-work-types');

UPDATE "menus" SET "sort_order" = 10 WHERE "slug" = 'fleet-vehicles';
UPDATE "menus" SET "sort_order" = 20 WHERE "slug" = 'fleet-maintenance';
UPDATE "menus" SET "sort_order" = 30 WHERE "slug" = 'fleet-fuel';
UPDATE "menus" SET "sort_order" = 40 WHERE "slug" = 'fleet-setup';
