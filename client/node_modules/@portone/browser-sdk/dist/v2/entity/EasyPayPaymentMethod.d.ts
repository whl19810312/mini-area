/**
 * 간편결제 결제수단
 */
export declare const EasyPayPaymentMethod: {
    /**
     * 카드
     */
    readonly CARD: "CARD";
    /**
     * 포인트(충전, 적립) 결제
     */
    readonly CHARGE: "CHARGE";
    /**
     * 계좌결제
     */
    readonly TRANSFER: "TRANSFER";
    /**
     * 포인트 및 계좌결제가 모두 가능한 경우
     */
    readonly MONEY: "MONEY";
};
/**
 * 간편결제 결제수단
 */
export type EasyPayPaymentMethod = (typeof EasyPayPaymentMethod)[keyof typeof EasyPayPaymentMethod];
