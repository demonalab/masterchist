-- CreateTable
CREATE TABLE "AbandonedConversation" (
    "id" TEXT NOT NULL,
    "telegramId" VARCHAR(32) NOT NULL,
    "serviceCode" "ServiceCode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "reminder2hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderNextDay" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AbandonedConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbandonedConversation_telegramId_completedAt_idx" ON "AbandonedConversation"("telegramId", "completedAt");

-- CreateIndex
CREATE INDEX "AbandonedConversation_startedAt_completedAt_idx" ON "AbandonedConversation"("startedAt", "completedAt");
