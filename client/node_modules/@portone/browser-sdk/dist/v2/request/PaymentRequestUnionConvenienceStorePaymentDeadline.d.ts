import type { OneOfType } from '../../utils.js';
/**
 * **편의점결제 지불기한**
 */
export type PaymentRequestUnionConvenienceStorePaymentDeadline = OneOfType<{
    /**
     * **유효 시간 (단위: 시간)**
     */
    validHours: number;
    /**
     * **만료일시**
     *
     * RFC 3339 형식입니다.
     */
    dueDate: string;
}>;
