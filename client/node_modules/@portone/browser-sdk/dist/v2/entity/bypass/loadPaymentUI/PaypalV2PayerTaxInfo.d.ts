/**
 * 구매자 정보
 */
export type PaypalV2PayerTaxInfo = {
    /**
     * 구매자 세금 정보 (브라질 구매자의 경우 필수 입력)
     */
    tax_id: string;
    tax_id_type: string;
};
