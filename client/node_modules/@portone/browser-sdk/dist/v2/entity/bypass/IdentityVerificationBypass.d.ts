import type { DanalIdentityVerificationBypass } from './identityVerification/Danal.js';
import type { InicisUnifiedIdentityVerificationBypass } from './identityVerification/InicisUnified.js';
import type { KcpV2IdentityVerificationBypass } from './identityVerification/KcpV2.js';
/**
 * **PG사 본인인증 창 호출 시 PG사로 그대로 bypass할 값들의 모음**
 */
export type IdentityVerificationBypass = {
    /**
     * **다날 bypass 파라미터**
     */
    danal?: DanalIdentityVerificationBypass | undefined;
    /**
     * **KG이니시스 bypass 파라미터**
     */
    inicisUnified?: InicisUnifiedIdentityVerificationBypass | undefined;
    /**
     * **KCP bypass 파라미터**
     */
    kcpV2?: KcpV2IdentityVerificationBypass | undefined;
};
