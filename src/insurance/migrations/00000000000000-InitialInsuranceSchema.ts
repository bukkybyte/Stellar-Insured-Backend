import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialInsuranceSchema00000000000000 implements MigrationInterface {
  name = 'InitialInsuranceSchema00000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE TYPE "risk_type_enum" AS ENUM('PROJECT_FAILURE', 'SMART_CONTRACT_EXPLOIT', 'MARKET_VOLATILITY')`);
    await queryRunner.query(`CREATE TYPE "policy_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED')`);
    await queryRunner.query(`CREATE TYPE "claim_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID')`);

    await queryRunner.query(`CREATE TABLE "insurance_pools" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "capital" numeric(18,2) NOT NULL,
      "lockedCapital" numeric(18,2) NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_insurance_pools_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_insurance_pools_createdAt" ON "insurance_pools" ("createdAt")`);

    await queryRunner.query(`CREATE TABLE "reinsurance_contracts" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "poolId" uuid NOT NULL,
      "coverageLimit" numeric(18,2) NOT NULL,
      "premiumRate" numeric(10,4) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_reinsurance_contracts_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_reinsurance_contracts_poolId" ON "reinsurance_contracts" ("poolId")`);
    await queryRunner.query(`ALTER TABLE "reinsurance_contracts" ADD CONSTRAINT "FK_reinsurance_contracts_poolId" FOREIGN KEY ("poolId") REFERENCES "insurance_pools"("id") ON DELETE CASCADE`);

    await queryRunner.query(`CREATE TABLE "insurance_policies" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" text NOT NULL,
      "poolId" uuid NOT NULL,
      "contractId" uuid,
      "riskType" "risk_type_enum" NOT NULL,
      "status" "policy_status_enum" NOT NULL DEFAULT 'ACTIVE',
      "startDate" timestamptz,
      "endDate" timestamptz,
      "premium" numeric(18,2) NOT NULL,
      "coverageAmount" numeric(18,2) NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_insurance_policies_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_insurance_policies_userId" ON "insurance_policies" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_insurance_policies_poolId" ON "insurance_policies" ("poolId")`);
    await queryRunner.query(`CREATE INDEX "IDX_insurance_policies_contractId" ON "insurance_policies" ("contractId")`);
    await queryRunner.query(`CREATE INDEX "IDX_insurance_policies_riskType" ON "insurance_policies" ("riskType")`);
    await queryRunner.query(`ALTER TABLE "insurance_policies" ADD CONSTRAINT "FK_insurance_policies_poolId" FOREIGN KEY ("poolId") REFERENCES "insurance_pools"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "insurance_policies" ADD CONSTRAINT "FK_insurance_policies_contractId" FOREIGN KEY ("contractId") REFERENCES "reinsurance_contracts"("id") ON DELETE SET NULL`);

    await queryRunner.query(`CREATE TABLE "claims" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "policyId" uuid NOT NULL,
      "claimAmount" numeric(18,2) NOT NULL,
      "description" text,
      "status" "claim_status_enum" NOT NULL DEFAULT 'PENDING',
      "payoutAmount" numeric(18,2),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_claims_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_claims_policyId" ON "claims" ("policyId")`);
    await queryRunner.query(`CREATE INDEX "IDX_claims_status" ON "claims" ("status")`);
    await queryRunner.query(`ALTER TABLE "claims" ADD CONSTRAINT "FK_claims_policyId" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE`);

    await queryRunner.query(`CREATE TABLE "claim_history" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "claimId" uuid NOT NULL,
      "status" character varying(50) NOT NULL,
      "reason" text,
      "actorId" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_claim_history_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`ALTER TABLE "claim_history" ADD CONSTRAINT "FK_claim_history_claimId" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "claim_history" DROP CONSTRAINT "FK_claim_history_claimId"`);
    await queryRunner.query(`DROP TABLE "claim_history"`);
    await queryRunner.query(`ALTER TABLE "claims" DROP CONSTRAINT "FK_claims_policyId"`);
    await queryRunner.query(`DROP TABLE "claims"`);
    await queryRunner.query(`ALTER TABLE "insurance_policies" DROP CONSTRAINT "FK_insurance_policies_contractId"`);
    await queryRunner.query(`ALTER TABLE "insurance_policies" DROP CONSTRAINT "FK_insurance_policies_poolId"`);
    await queryRunner.query(`DROP TABLE "insurance_policies"`);
    await queryRunner.query(`ALTER TABLE "reinsurance_contracts" DROP CONSTRAINT "FK_reinsurance_contracts_poolId"`);
    await queryRunner.query(`DROP TABLE "reinsurance_contracts"`);
    await queryRunner.query(`DROP TABLE "insurance_pools"`);
    await queryRunner.query(`DROP TYPE "claim_status_enum"`);
    await queryRunner.query(`DROP TYPE "policy_status_enum"`);
    await queryRunner.query(`DROP TYPE "risk_type_enum"`);
  }
}
