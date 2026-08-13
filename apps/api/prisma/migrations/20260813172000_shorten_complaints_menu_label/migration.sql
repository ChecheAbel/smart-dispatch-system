-- Shorten the Dispatch > Complaints sidebar label so it fits.
UPDATE "menus"
SET "translations" = jsonb_set(
  jsonb_set(
    COALESCE("translations", '{}'::jsonb),
    '{en,label}',
    '"Complaints"'
  ),
  '{am,label}',
  '"ቅሬታዎች"'
)
WHERE "slug" = 'complaints';
