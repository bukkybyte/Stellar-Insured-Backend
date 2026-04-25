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
exports.Claim = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const claim_status_enum_1 = require("../enums/claim-status.enum");
const insurance_policy_entity_1 = require("./insurance-policy.entity");
let Claim = class Claim {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, policyId: { required: true, type: () => String }, policy: { required: true, type: () => require("./insurance-policy.entity").InsurancePolicy }, claimAmount: { required: true, type: () => Number }, status: { required: true, enum: require("../enums/claim-status.enum").ClaimStatus }, payoutAmount: { required: false, type: () => Number }, createdAt: { required: true, type: () => Date } };
    }
};
exports.Claim = Claim;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Claim.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Claim.prototype, "policyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => insurance_policy_entity_1.InsurancePolicy, (policy) => policy.claims, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'policyId' }),
    __metadata("design:type", insurance_policy_entity_1.InsurancePolicy)
], Claim.prototype, "policy", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal'),
    __metadata("design:type", Number)
], Claim.prototype, "claimAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: claim_status_enum_1.ClaimStatus, default: claim_status_enum_1.ClaimStatus.PENDING }),
    __metadata("design:type", String)
], Claim.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { nullable: true }),
    __metadata("design:type", Number)
], Claim.prototype, "payoutAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Claim.prototype, "createdAt", void 0);
exports.Claim = Claim = __decorate([
    (0, typeorm_1.Entity)('claims')
], Claim);
//# sourceMappingURL=claim.entity.js.map