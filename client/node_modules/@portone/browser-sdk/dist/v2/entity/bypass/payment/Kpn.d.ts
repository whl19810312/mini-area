import { KpnCardSelect } from './KpnCardSelect.js';
/**
 * KPN bypass 파라미터
 */
export type KpnBypass = {
    /**
     * - 해외카드 (VISA + MASTER + JCB) : `GLOBAL`
     * - 11Pay (SKPay) : `11PAY`
     * - 구인증 : `LEGACY_AUTH`
     * - 키인 : `KEY_IN`
     */
    CardSelect?: KpnCardSelect[] | undefined;
};
