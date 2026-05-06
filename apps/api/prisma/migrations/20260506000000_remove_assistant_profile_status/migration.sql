ALTER TABLE "assistant_profiles" DROP COLUMN IF EXISTS "status";
ALTER TABLE "assistant_profiles" DROP COLUMN IF EXISTS "completedAt";

DROP TYPE IF EXISTS "AssistantProfileStatus";
