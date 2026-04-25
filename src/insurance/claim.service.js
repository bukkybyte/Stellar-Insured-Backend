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
exports.ClaimService = void 0;
const common_1 = require("@nestjs/common");
const claim_entity_1 = require("./entities/claim.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const claim_status_enum_1 = require("./enums/claim-status.enum");
const encryption_service_1 = require("../encryption/encryption.service");
let ClaimService = class ClaimService {
    constructor(repo, encryption) {
        this.repo = repo;
        this.encryption = encryption;
    }
    async assessClaim(claimId) {
        const claim = await this.repo.findOne({ where: { id: claimId } });
        if (!claim) {
            throw new Error(`Claim with ID ${claimId} not found`);
        }
        claim.status = claim_status_enum_1.ClaimStatus.APPROVED;
        claim.payoutAmount = claim.claimAmount;
        return this.repo.save(claim);
    }
    async payClaim(claimId) {
        const claim = await this.repo.findOne({ where: { id: claimId } });
        if (!claim) {
            throw new Error(`Claim with ID ${claimId} not found`);
        }
        claim.status = claim_status_enum_1.ClaimStatus.PAID;
        return this.repo.save(claim);
    }
    async createClaim(policyId, claimAmount) {
        const claim = this.repo.create({
            policyId,
            claimAmount: parseFloat(this.encryption.encrypt(claimAmount.toString())),
            status: claim_status_enum_1.ClaimStatus.PENDING,
        });
        return this.repo.save(claim);
    }
};
exports.ClaimService = ClaimService;
exports.ClaimService = ClaimService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(claim_entity_1.Claim)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        encryption_service_1.EncryptionService])
], ClaimService);
//# sourceMappingURL=claim.service.js.map