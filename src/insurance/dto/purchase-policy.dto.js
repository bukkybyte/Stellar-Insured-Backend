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
exports.PurchasePolicyDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const risk_type_enum_1 = require("../enums/risk-type.enum");
class PurchasePolicyDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { userId: { required: true, type: () => String }, poolId: { required: true, type: () => String }, riskType: { required: true, enum: require("../enums/risk-type.enum").RiskType }, coverageAmount: { required: true, type: () => Number } };
    }
}
exports.PurchasePolicyDto = PurchasePolicyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchasePolicyDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PurchasePolicyDto.prototype, "poolId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(risk_type_enum_1.RiskType),
    __metadata("design:type", String)
], PurchasePolicyDto.prototype, "riskType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], PurchasePolicyDto.prototype, "coverageAmount", void 0);
//# sourceMappingURL=purchase-policy.dto.js.map