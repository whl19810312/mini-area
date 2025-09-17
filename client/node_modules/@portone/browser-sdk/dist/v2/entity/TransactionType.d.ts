/**
 * **트랜잭션 유형**
 *
 * - PAYMENT: 결제
 * - ISSUE\_BILLING\_KEY: 빌링키 발급
 * - IDENTITY\_VERIFICATION: 본인 인증
 * - ISSUE\_BILLING\_KEY\_AND\_PAY: 빌링키 발급과 동시에 결제
 */
export declare const TransactionType: {
    /**
     * 결제
     */
    readonly PAYMENT: "PAYMENT";
    /**
     * 빌링키 발급
     */
    readonly ISSUE_BILLING_KEY: "ISSUE_BILLING_KEY";
    /**
     * 본인 인증
     */
    readonly IDENTITY_VERIFICATION: "IDENTITY_VERIFICATION";
    /**
     * 빌링키 발급 및 초회결제
     */
    readonly ISSUE_BILLING_KEY_AND_PAY: "ISSUE_BILLING_KEY_AND_PAY";
};
/**
 * **트랜잭션 유형**
 *
 * - PAYMENT: 결제
 * - ISSUE\_BILLING\_KEY: 빌링키 발급
 * - IDENTITY\_VERIFICATION: 본인 인증
 * - ISSUE\_BILLING\_KEY\_AND\_PAY: 빌링키 발급과 동시에 결제
 */
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
