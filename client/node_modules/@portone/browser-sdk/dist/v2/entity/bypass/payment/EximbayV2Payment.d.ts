/**
 * 결제 정보
 */
export type EximbayV2Payment = {
    /**
     * 결제수단 단독 노출
     */
    payment_method?: string | undefined;
    /**
     * 결제수단 노출 목록
     */
    multi_payment_method?: string[] | undefined;
};
