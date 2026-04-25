"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceService = void 0;
const common_1 = require("@nestjs/common");
const pricing_service_1 = require("./pricing.service");
const pool_service_1 = require("./pool.service");
const insurance_policy_entity_1 = require("./entities/insurance-policy.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const encryption_service_1 = require("../encryption/encryption.service");
let InsuranceService = class InsuranceService {
    constructor(pricing, pools, repo, encryption) {
        this.pricing = pricing;
        this.pools = pools;
        this.repo = repo;
        this.encryption = encryption;
    }
    async purchasePolicy(userId, poolId, riskType, coverageAmount) {
        const premium = this.pricing.calculatePremium(riskType, coverageAmount);
        await this.pools.lockCapital(poolId, coverageAmount);
        const policy = this.repo.create({
            userId,
            poolId,
            riskType,
            coverageAmount: parseFloat(this.encryption.encrypt(coverageAmount.toString())),
            premium: parseFloat(this.encryption.encrypt(premium.toString())),
        });
        return this.repo.save(policy);
    }
};
exports.InsuranceService = InsuranceService;
exports.InsuranceService = InsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_2.InjectRepository)(insurance_policy_entity_1.InsurancePolicy)),
    __metadata("design:paramtypes", [pricing_service_1.PricingService,
        pool_service_1.PoolService,
        typeorm_1.Repository,
        encryption_service_1.EncryptionService])
], InsuranceService);
//# sourceMappingURL=insurance.service.js.map