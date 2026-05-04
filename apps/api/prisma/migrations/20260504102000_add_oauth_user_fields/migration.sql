ALTER TABLE "users" ADD COLUMN "googleSubject" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_googleSubject_key" ON "users"("googleSubject");
