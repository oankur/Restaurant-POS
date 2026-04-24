/*
  Warnings:

  - You are about to drop the column `outletId` on the `User` table. All the data in the column will be lost.
  - Added the required column `managerPassword` to the `Outlet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Outlet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Outlet` table without a default value. This is not possible if the table is not empty.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Outlet" ("address", "createdAt", "id", "isActive", "name", "phone", "updatedAt") SELECT "address", "createdAt", "id", "isActive", "name", "phone", "updatedAt" FROM "Outlet";
DROP TABLE "Outlet";
ALTER TABLE "new_Outlet" RENAME TO "Outlet";
CREATE UNIQUE INDEX "Outlet_username_key" ON "Outlet"("username");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isActive", "name", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
