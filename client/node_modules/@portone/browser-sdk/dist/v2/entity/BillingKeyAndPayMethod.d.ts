/**
 * 빌링키 발급 및 초회결제 수단
 */
export declare const BillingKeyAndPayMethod: {
    /**
     * 휴대전화
     */
    readonly MOBILE: "MOBILE";
};
/**
 * 빌링키 발급 및 초회결제 수단
 */
export type BillingKeyAndPayMethod = (typeof BillingKeyAndPayMethod)[keyof typeof BillingKeyAndPayMethod];
