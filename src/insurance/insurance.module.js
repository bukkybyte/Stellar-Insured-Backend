"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const prisma_service_1 = require("../prisma.service");
const insurance_policy_entity_1 = require("./entities/insurance-policy.entity");
const insurance_pool_entity_1 = require("./entities/insurance-pool.entity");
const claim_entity_1 = require("./entities/claim.entity");
const reinsurance_contract_entity_1 = require("./entities/reinsurance-contract.entity");
const insurance_controller_1 = require("./insurance.controller");
const insurance_service_1 = require("./insurance.service");
const pool_service_1 = require("./pool.service");
const claim_service_1 = require("./claim.service");
const reinsurance_service_1 = require("./reinsurance.service");
const pricing_service_1 = require("./pricing.service");
const idempotency_interceptor_1 = require("../interceptors/idempotency.interceptor");
let InsuranceModule = class InsuranceModule {
};
exports.InsuranceModule = InsuranceModule;
exports.InsuranceModule = InsuranceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                insurance_policy_entity_1.InsurancePolicy,
                insurance_pool_entity_1.InsurancePool,
                claim_entity_1.Claim,
                reinsurance_contract_entity_1.ReinsuranceContract,
            ]),
        ],
        controllers: [insurance_controller_1.InsuranceController],
        providers: [
            insurance_service_1.InsuranceService,
            pool_service_1.PoolService,
            claim_service_1.ClaimService,
            reinsurance_service_1.ReinsuranceService,
            pricing_service_1.PricingService,
            prisma_service_1.PrismaService,
            idempotency_interceptor_1.IdempotencyInterceptor,
        ],
        exports: [
            insurance_service_1.InsuranceService,
            pool_service_1.PoolService,
            claim_service_1.ClaimService,
            reinsurance_service_1.ReinsuranceService,
            pricing_service_1.PricingService,
            prisma_service_1.PrismaService,
        ],
    })
], InsuranceModule);
//# sourceMappingURL=insurance.module.js.map