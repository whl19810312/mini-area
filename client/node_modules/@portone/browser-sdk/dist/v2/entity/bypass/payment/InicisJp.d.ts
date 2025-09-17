import type { InicisJpPaymentUI } from './InicisJpPaymentUI.js';
/**
 * 이니시스 일본 bypass 파라미터
 */
export type InicisJpBypass = {
    /**
     * 결제창 UI 설정
     */
    paymentUI?: InicisJpPaymentUI | undefined;
};
