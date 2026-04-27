-- Initial Prisma migration baseline for the current schema.
-- This file should be committed and used as the first migration in the project.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FUNDED');
CREATE TYPE "RiskType" AS ENUM ('PROJECT_FAILURE', 'SMART_CONTRACT_EXPLOIT', 'MARKET_VOLATILITY');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'PAYOUT', 'PURCHASE', 'ADD_CAPITAL');
CREATE TYPE "NotificationType" AS ENUM ('CONTRIBUTION', 'MILESTONE', 'DEADLINE', 'SYSTEM');
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "users" (
  "id" text NOT NULL PRIMARY KEY,
  "wallet_address" text NOT NULL UNIQUE,
  "profile_data" jsonb,
  "reputation_score" integer NOT NULL DEFAULT 0,
  "trust_score" integer NOT NULL DEFAULT 500,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "email" text UNIQUE,
  "push_subscription" jsonb
);
CREATE INDEX "users_deleted_at_index" ON "users" ("deleted_at");

CREATE TABLE "projects" (
  "id" text NOT NULL PRIMARY KEY,
  "contract_id" text NOT NULL UNIQUE,
  "creator_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "category" text NOT NULL,
  "goal" bigint NOT NULL,
  "current_funds" bigint NOT NULL DEFAULT 0,
  "deadline" timestamptz NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "ipfs_hash" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "projects_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "projects_creator_id_index" ON "projects" ("creator_id");
CREATE INDEX "projects_status_deadline_index" ON "projects" ("status", "deadline");
CREATE INDEX "projects_deleted_at_index" ON "projects" ("deleted_at");

CREATE TABLE "contributions" (
  "id" text NOT NULL PRIMARY KEY,
  "transaction_hash" text NOT NULL UNIQUE,
  "investor_id" text NOT NULL,
  "project_id" text NOT NULL,
  "amount" bigint NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "contributions_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "contributions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);
CREATE INDEX "contributions_investor_id_index" ON "contributions" ("investor_id");
CREATE INDEX "contributions_project_id_index" ON "contributions" ("project_id");
CREATE INDEX "contributions_project_investor_index" ON "contributions" ("project_id", "investor_id");
CREATE INDEX "contributions_deleted_at_index" ON "contributions" ("deleted_at");

CREATE TABLE "milestones" (
  "id" text NOT NULL PRIMARY KEY,
  "project_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "funding_amount" bigint NOT NULL,
  "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "completion_date" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);
CREATE INDEX "milestones_project_id_index" ON "milestones" ("project_id");
CREATE INDEX "milestones_status_index" ON "milestones" ("status");
CREATE INDEX "milestones_deleted_at_index" ON "milestones" ("deleted_at");

CREATE TABLE "reputation_history" (
  "id" text NOT NULL PRIMARY KEY,
  "user_id" text NOT NULL,
  "score_change" integer NOT NULL,
  "reason" text NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "reputation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "reputation_history_user_id_index" ON "reputation_history" ("user_id");
CREATE INDEX "reputation_history_timestamp_index" ON "reputation_history" ("timestamp");
CREATE INDEX "reputation_history_deleted_at_index" ON "reputation_history" ("deleted_at");

CREATE TABLE "categories" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "categories_deleted_at_index" ON "categories" ("deleted_at");

CREATE TABLE "insurance_pools" (
  "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "capital" numeric(18,2) NOT NULL,
  "locked_capital" numeric(18,2) NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "insurance_pools_deleted_at_index" ON "insurance_pools" ("deleted_at");

CREATE TABLE "reinsurance_contracts" (
  "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "pool_id" uuid NOT NULL,
  "coverage_limit" numeric(18,2) NOT NULL,
  "premium_rate" numeric(10,4) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "reinsurance_contracts_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "insurance_pools"("id") ON DELETE CASCADE
);
CREATE INDEX "reinsurance_contracts_pool_id_index" ON "reinsurance_contracts" ("pool_id");
CREATE INDEX "reinsurance_contracts_deleted_at_index" ON "reinsurance_contracts" ("deleted_at");

CREATE TABLE "insurance_policies" (
  "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "pool_id" uuid NOT NULL,
  "contract_id" uuid,
  "risk_type" "RiskType" NOT NULL,
  "premium" numeric(18,2) NOT NULL,
  "coverage_amount" numeric(18,2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "insurance_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "insurance_policies_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "insurance_pools"("id") ON DELETE CASCADE,
  CONSTRAINT "insurance_policies_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "reinsurance_contracts"("id") ON DELETE SET NULL
);
CREATE INDEX "insurance_policies_user_id_index" ON "insurance_policies" ("user_id");
CREATE INDEX "insurance_policies_pool_id_index" ON "insurance_policies" ("pool_id");
CREATE INDEX "insurance_policies_contract_id_index" ON "insurance_policies" ("contract_id");
CREATE INDEX "insurance_policies_risk_type_index" ON "insurance_policies" ("risk_type");
CREATE INDEX "insurance_policies_deleted_at_index" ON "insurance_policies" ("deleted_at");

CREATE TABLE "claims" (
  "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "policy_id" uuid NOT NULL,
  "claim_amount" numeric(18,2) NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "payout_amount" numeric(18,2),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "insurance_policies"("id") ON DELETE CASCADE
);
CREATE INDEX "claims_policy_id_index" ON "claims" ("policy_id");
CREATE INDEX "claims_status_index" ON "claims" ("status");
CREATE INDEX "claims_deleted_at_index" ON "claims" ("deleted_at");

CREATE TABLE "audit_logs" (
  "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text,
  "action" "AuditAction" NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "before_state" jsonb,
  "after_state" jsonb,
  "ip_address" text,
  "user_agent" text,
  "transaction_hash" text,
  "reason" text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_logs_user_id_index" ON "audit_logs" ("user_id");
CREATE INDEX "audit_logs_entity_type_entity_id_index" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX "audit_logs_timestamp_index" ON "audit_logs" ("timestamp");
CREATE INDEX "audit_logs_deleted_at_index" ON "audit_logs" ("deleted_at");

CREATE TABLE "ledger_cursors" (
  "id" text NOT NULL PRIMARY KEY,
  "network" text NOT NULL UNIQUE,
  "last_ledger_seq" integer NOT NULL,
  "last_ledger_hash" text,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "ledger_cursors_deleted_at_index" ON "ledger_cursors" ("deleted_at");

CREATE TABLE "processed_events" (
  "id" text NOT NULL PRIMARY KEY,
  "event_id" text NOT NULL UNIQUE,
  "network" text NOT NULL,
  "ledger_seq" integer NOT NULL,
  "contract_id" text NOT NULL,
  "event_type" text NOT NULL,
  "transaction_hash" text NOT NULL,
  "processed_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "processed_events_network_ledger_seq_index" ON "processed_events" ("network", "ledger_seq");
CREATE INDEX "processed_events_contract_type_index" ON "processed_events" ("contract_id", "event_type");
CREATE INDEX "processed_events_deleted_at_index" ON "processed_events" ("deleted_at");

CREATE TABLE "indexer_logs" (
  "id" text NOT NULL PRIMARY KEY,
  "level" text NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "indexer_logs_timestamp_index" ON "indexer_logs" ("timestamp");
CREATE INDEX "indexer_logs_level_index" ON "indexer_logs" ("level");
CREATE INDEX "indexer_logs_deleted_at_index" ON "indexer_logs" ("deleted_at");

CREATE TABLE "notification_settings" (
  "id" text NOT NULL PRIMARY KEY,
  "user_id" text NOT NULL UNIQUE,
  "email_enabled" boolean NOT NULL DEFAULT true,
  "push_enabled" boolean NOT NULL DEFAULT false,
  "notify_contributions" boolean NOT NULL DEFAULT true,
  "notify_milestones" boolean NOT NULL DEFAULT true,
  "notify_deadlines" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "notification_settings_deleted_at_index" ON "notification_settings" ("deleted_at");

CREATE TABLE "notifications" (
  "id" text NOT NULL PRIMARY KEY,
  "user_id" text NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "data" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "notifications_user_id_index" ON "notifications" ("user_id");
CREATE INDEX "notifications_user_read_created_at_index" ON "notifications" ("user_id", "read", "created_at");
CREATE INDEX "notifications_deleted_at_index" ON "notifications" ("deleted_at");

CREATE TABLE "email_outbox" (
  "id" text NOT NULL PRIMARY KEY,
  "to" text NOT NULL,
  "subject" text NOT NULL,
  "html" text NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "email_outbox_status_index" ON "email_outbox" ("status");
CREATE INDEX "email_outbox_status_created_at_index" ON "email_outbox" ("status", "created_at");
CREATE INDEX "email_outbox_deleted_at_index" ON "email_outbox" ("deleted_at");

CREATE TABLE "idempotency_keys" (
  "id" text NOT NULL PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "method" text NOT NULL,
  "endpoint" text NOT NULL,
  "request_body" jsonb NOT NULL,
  "response" jsonb,
  "status" text NOT NULL DEFAULT 'PENDING',
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);
CREATE INDEX "idempotency_keys_expires_at_index" ON "idempotency_keys" ("expires_at");
CREATE INDEX "idempotency_keys_method_endpoint_index" ON "idempotency_keys" ("method", "endpoint");
CREATE INDEX "idempotency_keys_deleted_at_index" ON "idempotency_keys" ("deleted_at");
