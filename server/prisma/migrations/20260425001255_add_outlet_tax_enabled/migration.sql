-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "managerPassword" TEXT NOT NULL,
    "taxRate" REAL NOT NULL DEFAULT 0.05,
    "taxEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Outlet" ("address", "createdAt", "id", "isActive", "managerPassword", "name", "password", "phone", "taxRate", "updatedAt", "username") SELECT "address", "createdAt", "id", "isActive", "managerPassword", "name", "password", "phone", "taxRate", "updatedAt", "username" FROM "Outlet";
DROP TABLE "Outlet";
ALTER TABLE "new_Outlet" RENAME TO "Outlet";
CREATE UNIQUE INDEX "Outlet_username_key" ON "Outlet"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
