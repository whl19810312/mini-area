import type { OneOfType } from '../../utils.js';
/**
 * **고정식 가상계좌 설정**
 */
export type PaymentRequestUnionVirtualAccountFixedOption = OneOfType<{
    /**
     * PG사로부터 사전에 가상계좌에 대한 ID를 발급받아 사용하는 경우의 가상계좌 ID
     */
    pgAccountId: string;
    /**
     * 고정식으로 사용할 가상계좌 번호
     */
    accountNumber: string;
}>;
