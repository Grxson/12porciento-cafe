-- CreateTable Reward
CREATE TABLE IF NOT EXISTS "Reward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "xpCost" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 10,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable RewardClaim
CREATE TABLE IF NOT EXISTS "RewardClaim" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Reward_isActive_idx" ON "Reward"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_code_key" ON "RewardClaim"("code");
CREATE INDEX IF NOT EXISTS "RewardClaim_userId_idx" ON "RewardClaim"("userId");
CREATE INDEX IF NOT EXISTS "RewardClaim_code_idx" ON "RewardClaim"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "RewardClaim_rewardId_userId_key" ON "RewardClaim"("rewardId", "userId");

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
