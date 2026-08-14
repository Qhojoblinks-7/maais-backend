/*
  Add index on createdAt for support_tickets to improve ticket listing performance.
*/
-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");
