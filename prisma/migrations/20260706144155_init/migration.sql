-- CreateEnum
CREATE TYPE "Discipline" AS ENUM ('SURFING', 'KITE_SURFING', 'YACHTING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "nickname" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "discipline" "Discipline"[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
