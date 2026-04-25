"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionTransformer = void 0;
exports.createEncryptionTransformer = createEncryptionTransformer;
class EncryptionTransformer {
    constructor(encryptionService) {
        this.encryptionService = encryptionService;
    }
    from(value) {
        if (!value) {
            return null;
        }
        try {
            const decrypted = this.encryptionService.decrypt(value);
            return parseFloat(decrypted);
        }
        catch (error) {
            return parseFloat(value);
        }
    }
    to(value) {
        if (!value) {
            return null;
        }
        return this.encryptionService.encrypt(value.toString());
    }
}
exports.EncryptionTransformer = EncryptionTransformer;
function createEncryptionTransformer(encryptionService) {
    return new EncryptionTransformer(encryptionService);
}
//# sourceMappingURL=encryption.transformer.js.map