/**
 * 현금영수증 발급타입
 *
 * - CULTURE: 문화비
 * - GENERAL: 일반 (기본값)
 * - PUBLIC\_TP: 교통비
 */
export declare const TosspayV2CashReceiptTradeOption: {
    /**
     * 문화비
     */
    readonly CULTURE: "CULTURE";
    /**
     * 일반 (기본값)
     */
    readonly GENERAL: "GENERAL";
    /**
     * 교통비
     */
    readonly PUBLIC_TP: "PUBLIC_TP";
};
/**
 * 현금영수증 발급타입
 *
 * - CULTURE: 문화비
 * - GENERAL: 일반 (기본값)
 * - PUBLIC\_TP: 교통비
 */
export type TosspayV2CashReceiptTradeOption = (typeof TosspayV2CashReceiptTradeOption)[keyof typeof TosspayV2CashReceiptTradeOption];
