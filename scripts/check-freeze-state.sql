SELECT id, "termNumber", "isActive", "endDate" FROM "terms" WHERE "isActive" = true;
SELECT id, "systemFrozen", "systemFreezeReason", "lastManualUnfreeze", "updatedAt" FROM "adminSettings" LIMIT 1;
