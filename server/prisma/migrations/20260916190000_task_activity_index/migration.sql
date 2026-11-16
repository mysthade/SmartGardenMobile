-- Speeds dashboard activity task fan-out: WHERE userId + deletedAt NULL ORDER BY createdAt DESC
CREATE INDEX IF NOT EXISTS "Task_userId_deletedAt_createdAt_idx" ON "Task"("userId", "deletedAt", "createdAt");
