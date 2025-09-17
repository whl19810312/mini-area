import { TosspayV2CashReceiptTradeOption } from './TosspayV2CashReceiptTradeOption.js';
/**
 * 토스페이 bypass 파라미터
 */
export type TosspayV2PaymentBypass = {
    /**
     * 결제 만료 기한 (yyyy-MM-dd HH:mm:ss)
     */
    expiredTime?: string | undefined;
    /**
     * 현금영수증 발급타입
     *
     * - CULTURE: 문화비
     * - GENERAL: 일반 (기본값)
     * - PUBLIC\_TP: 교통비
     */
    cashReceiptTradeOption?: TosspayV2CashReceiptTradeOption | undefined;
};
