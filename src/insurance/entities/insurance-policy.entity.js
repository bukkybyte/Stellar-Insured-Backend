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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsurancePolicy = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const risk_type_enum_1 = require("../enums/risk-type.enum");
const claim_entity_1 = require("./claim.entity");
const reinsurance_contract_entity_1 = require("./reinsurance-contract.entity");
let InsurancePolicy = class InsurancePolicy {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, userId: { required: true, type: () => String }, riskType: { required: true, enum: require("../enums/risk-type.enum").RiskType }, premium: { required: true, type: () => Number }, coverageAmount: { required: true, type: () => Number }, poolId: { required: true, type: () => String }, pool: { required: true, type: () => require("./reinsurance-contract.entity").ReinsuranceContract }, claims: { required: true, type: () => [require("./claim.entity").Claim] }, createdAt: { required: true, type: () => Date } };
    }
};
exports.InsurancePolicy = InsurancePolicy;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], InsurancePolicy.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InsurancePolicy.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: risk_type_enum_1.RiskType }),
    __metadata("design:type", String)
], InsurancePolicy.prototype, "riskType", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal'),
    __metadata("design:type", Number)
], InsurancePolicy.prototype, "premium", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal'),
    __metadata("design:type", Number)
], InsurancePolicy.prototype, "coverageAmount", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], InsurancePolicy.prototype, "poolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => reinsurance_contract_entity_1.ReinsuranceContract, (contract) => contract.policies, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'poolId' }),
    __metadata("design:type", reinsurance_contract_entity_1.ReinsuranceContract)
], InsurancePolicy.prototype, "pool", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => claim_entity_1.Claim, (claim) => claim.policy),
    __metadata("design:type", Array)
], InsurancePolicy.prototype, "claims", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], InsurancePolicy.prototype, "createdAt", void 0);
exports.InsurancePolicy = InsurancePolicy = __decorate([
    (0, typeorm_1.Entity)('insurance_policies')
], InsurancePolicy);
//# sourceMappingURL=insurance-policy.entity.js.map