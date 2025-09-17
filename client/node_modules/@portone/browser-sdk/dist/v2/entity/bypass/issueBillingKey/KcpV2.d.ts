import { KcpV2BatchSocChoice } from './KcpV2BatchSocChoice.js';
/**
 * **KCP bypass 파라미터**
 */
export type KcpV2IssueBillingKeyBypass = {
    /**
     * 결제창에서 주민번호/사업자 번호 고정여부 설정
     */
    batch_soc_choice?: KcpV2BatchSocChoice | undefined;
};
