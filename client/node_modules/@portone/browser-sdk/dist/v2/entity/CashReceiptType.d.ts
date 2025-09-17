/**
 * **현금영수증 발급 유형**
 */
export declare const CashReceiptType: {
    /**
     * 소득공제(개인)
     */
    readonly PERSONAL: "PERSONAL";
    /**
     * 지출증빙(사업자)
     */
    readonly CORPORATE: "CORPORATE";
    /**
     * 미발행(PG 설정에 따라 무기명으로 자진 발급될 수 있음)
     */
    readonly ANONYMOUS: "ANONYMOUS";
};
/**
 * **현금영수증 발급 유형**
 */
export type CashReceiptType = (typeof CashReceiptType)[keyof typeof CashReceiptType] | `CASH_RECEIPT_TYPE_${(typeof CashReceiptType)[keyof typeof CashReceiptType]}`;
