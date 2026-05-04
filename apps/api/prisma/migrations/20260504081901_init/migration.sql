-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AssistantProfileStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AssistantProfileSource" AS ENUM ('DESKTOP_SETUP', 'WEB_CONSOLE', 'API');

-- CreateEnum
CREATE TYPE "ProviderId" AS ENUM ('OLLAMA', 'OPENAI', 'GEMINI', 'ANTHROPIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UsageMode" AS ENUM ('LOCAL', 'CLOUD');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('NOT_CONFIGURED', 'CONFIGURED', 'VERIFIED', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkspaceConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'NEEDS_AUTH', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "os" TEXT,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "localStatus" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_pairings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "codeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "useCase" TEXT NOT NULL DEFAULT 'daily',
    "answerStyle" TEXT NOT NULL DEFAULT 'moderate',
    "priority" TEXT NOT NULL DEFAULT 'balanced',
    "languageUse" TEXT NOT NULL DEFAULT 'korean',
    "localMode" TEXT NOT NULL DEFAULT 'local',
    "provider" "ProviderId" NOT NULL DEFAULT 'OLLAMA',
    "model" TEXT NOT NULL,
    "futureFeatures" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssistantProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "AssistantProfileSource" NOT NULL DEFAULT 'WEB_CONSOLE',
    "prompt" JSONB,
    "capabilities" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assistantProfileId" TEXT,
    "provider" "ProviderId" NOT NULL,
    "localModel" TEXT,
    "cloudModel" TEXT,
    "fallbackPolicy" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ProviderId" NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "maskedKey" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'CONFIGURED',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "accountEmail" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "status" "WorkspaceConnectionStatus" NOT NULL DEFAULT 'NEEDS_AUTH',
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "toolId" TEXT NOT NULL,
    "permissionScope" JSONB NOT NULL DEFAULT '{}',
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "assistantProfileId" TEXT,
    "mode" "UsageMode" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'chat',
    "inputChars" INTEGER NOT NULL DEFAULT 0,
    "outputChars" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "devices_userId_idx" ON "devices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_pairings_codeHash_key" ON "device_pairings"("codeHash");

-- CreateIndex
CREATE INDEX "device_pairings_userId_idx" ON "device_pairings"("userId");

-- CreateIndex
CREATE INDEX "device_pairings_deviceId_idx" ON "device_pairings"("deviceId");

-- CreateIndex
CREATE INDEX "assistant_profiles_userId_idx" ON "assistant_profiles"("userId");

-- CreateIndex
CREATE INDEX "assistant_profiles_userId_isDefault_idx" ON "assistant_profiles"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "model_preferences_userId_idx" ON "model_preferences"("userId");

-- CreateIndex
CREATE INDEX "model_preferences_assistantProfileId_idx" ON "model_preferences"("assistantProfileId");

-- CreateIndex
CREATE INDEX "provider_credentials_userId_idx" ON "provider_credentials"("userId");

-- CreateIndex
CREATE INDEX "workspace_connections_userId_idx" ON "workspace_connections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_connections_userId_provider_key" ON "workspace_connections"("userId", "provider");

-- CreateIndex
CREATE INDEX "tool_permissions_userId_idx" ON "tool_permissions"("userId");

-- CreateIndex
CREATE INDEX "tool_permissions_deviceId_idx" ON "tool_permissions"("deviceId");

-- CreateIndex
CREATE INDEX "usage_events_userId_idx" ON "usage_events"("userId");

-- CreateIndex
CREATE INDEX "usage_events_deviceId_idx" ON "usage_events"("deviceId");

-- CreateIndex
CREATE INDEX "usage_events_assistantProfileId_idx" ON "usage_events"("assistantProfileId");

-- CreateIndex
CREATE INDEX "usage_events_createdAt_idx" ON "usage_events"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_deviceId_idx" ON "audit_logs"("deviceId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_pairings" ADD CONSTRAINT "device_pairings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_profiles" ADD CONSTRAINT "assistant_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_preferences" ADD CONSTRAINT "model_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_preferences" ADD CONSTRAINT "model_preferences_assistantProfileId_fkey" FOREIGN KEY ("assistantProfileId") REFERENCES "assistant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_connections" ADD CONSTRAINT "workspace_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_permissions" ADD CONSTRAINT "tool_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_permissions" ADD CONSTRAINT "tool_permissions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_assistantProfileId_fkey" FOREIGN KEY ("assistantProfileId") REFERENCES "assistant_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
