/**
 * 토스페이먼츠 bypass 파라미터
 */
export type TosspaymentsPaymentBypass = {
    /**
     * 토스페이먼츠 <-> 고객사 계약에 따라 프로모션 적용이 가능한 코드
     */
    discountCode?: string | undefined;
    /**
     * 해외 카드로만 결제가 가능하도록 할 지 여부
     */
    useInternationalCardOnly?: boolean | undefined;
};
