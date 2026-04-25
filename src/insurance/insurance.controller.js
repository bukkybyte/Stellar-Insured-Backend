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
exports.InsuranceController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const insurance_service_1 = require("./insurance.service");
const claim_service_1 = require("./claim.service");
const reinsurance_service_1 = require("./reinsurance.service");
const purchase_policy_dto_1 = require("./dto/purchase-policy.dto");
const create_reinsurance_dto_1 = require("./dto/create-reinsurance.dto");
const idempotency_interceptor_1 = require("../interceptors/idempotency.interceptor");
let InsuranceController = class InsuranceController {
    constructor(insurance, claims, reinsurance) {
        this.insurance = insurance;
        this.claims = claims;
        this.reinsurance = reinsurance;
    }
    async purchase(body) {
        return this.insurance.purchasePolicy(body.userId, body.poolId, body.riskType, body.coverageAmount);
    }
    async assessClaim(claimId) {
        return this.claims.assessClaim(claimId);
    }
    async payClaim(claimId) {
        return this.claims.payClaim(claimId);
    }
    async createReinsurance(body) {
        return this.reinsurance.createContract(body.poolId, body.coverageLimit, body.premiumRate);
    }
};
exports.InsuranceController = InsuranceController;
__decorate([
    (0, common_1.Post)('purchase'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    openapi.ApiResponse({ status: 201, type: require("./entities/insurance-policy.entity").InsurancePolicy }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [purchase_policy_dto_1.PurchasePolicyDto]),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "purchase", null);
__decorate([
    (0, common_1.Post)('claims/:claimId/assess'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    openapi.ApiResponse({ status: 201, type: require("./entities/claim.entity").Claim }),
    __param(0, (0, common_1.Param)('claimId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "assessClaim", null);
__decorate([
    (0, common_1.Post)('claims/:claimId/pay'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    openapi.ApiResponse({ status: 201, type: require("./entities/claim.entity").Claim }),
    __param(0, (0, common_1.Param)('claimId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "payClaim", null);
__decorate([
    (0, common_1.Post)('reinsurance'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    openapi.ApiResponse({ status: 201, type: require("./entities/reinsurance-contract.entity").ReinsuranceContract }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_reinsurance_dto_1.CreateReinsuranceDto]),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "createReinsurance", null);
exports.InsuranceController = InsuranceController = __decorate([
    (0, common_1.Controller)('api/insurance'),
    __metadata("design:paramtypes", [insurance_service_1.InsuranceService,
        claim_service_1.ClaimService,
        reinsurance_service_1.ReinsuranceService])
], InsuranceController);
//# sourceMappingURL=insurance.controller.js.map