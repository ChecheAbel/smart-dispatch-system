-- Reorder Vehicle Management (fleet) submenu items for a clearer workflow.
UPDATE "menus" SET "sort_order" = 10 WHERE "slug" = 'fleet-vehicles';
UPDATE "menus" SET "sort_order" = 20 WHERE "slug" = 'vehicle-types';
UPDATE "menus" SET "sort_order" = 30 WHERE "slug" = 'vehicle-classes';
UPDATE "menus" SET "sort_order" = 40 WHERE "slug" = 'fleet-maintenance';
UPDATE "menus" SET "sort_order" = 50 WHERE "slug" = 'maintenance-work-types';
UPDATE "menus" SET "sort_order" = 60 WHERE "slug" = 'fleet-fuel';
