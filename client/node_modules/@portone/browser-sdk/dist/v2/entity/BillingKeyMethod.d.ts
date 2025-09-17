/**
 * 빌링키 발급 수단
 */
export declare const BillingKeyMethod: {
    /**
     * 카드
     */
    readonly CARD: "CARD";
    /**
     * 휴대전화
     */
    readonly MOBILE: "MOBILE";
    /**
     * 간편결제
     */
    readonly EASY_PAY: "EASY_PAY";
    /**
     * 페이팔(RT)
     */
    readonly PAYPAL: "PAYPAL";
};
/**
 * 빌링키 발급 수단
 */
export type BillingKeyMethod = (typeof BillingKeyMethod)[keyof typeof BillingKeyMethod];
