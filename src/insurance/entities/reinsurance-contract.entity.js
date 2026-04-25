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
exports.ReinsuranceContract = void 0;
const openapi = require("@nestjs/swagger");
const typeorm_1 = require("typeorm");
const insurance_policy_entity_1 = require("./insurance-policy.entity");
let ReinsuranceContract = class ReinsuranceContract {
    static _OPENAPI_METADATA_FACTORY() {
        return { id: { required: true, type: () => String }, poolId: { required: true, type: () => String }, coverageLimit: { required: true, type: () => Number }, premiumRate: { required: true, type: () => Number }, policies: { required: true, type: () => [require("./insurance-policy.entity").InsurancePolicy] }, createdAt: { required: true, type: () => Date } };
    }
};
exports.ReinsuranceContract = ReinsuranceContract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReinsuranceContract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ReinsuranceContract.prototype, "poolId", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal'),
    __metadata("design:type", Number)
], ReinsuranceContract.prototype, "coverageLimit", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal'),
    __metadata("design:type", Number)
], ReinsuranceContract.prototype, "premiumRate", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => insurance_policy_entity_1.InsurancePolicy, (policy) => policy.pool),
    __metadata("design:type", Array)
], ReinsuranceContract.prototype, "policies", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ReinsuranceContract.prototype, "createdAt", void 0);
exports.ReinsuranceContract = ReinsuranceContract = __decorate([
    (0, typeorm_1.Entity)('reinsurance_contracts')
], ReinsuranceContract);
//# sourceMappingURL=reinsurance-contract.entity.js.map