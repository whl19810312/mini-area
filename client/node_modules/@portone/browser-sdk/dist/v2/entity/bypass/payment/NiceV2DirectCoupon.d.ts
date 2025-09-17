/**
 * 신용카드 쿠폰 자동 적용 여부 (Y: 사전 등록된 선 할인 쿠폰을 자동 적용 / N: 쿠폰 미적용(기본값))
 *
 * 할부 거래 요청 시 할인 적용 후 승인 금액이 할부 가능 금액 (50,000) 미만인 경우 인증 실패 처리
 */
export declare const NiceV2DirectCoupon: {
    /**
     * 사전 등록된 선 할인 쿠폰을 자동 적용
     */
    readonly Y: "Y";
    /**
     * 쿠폰 미적용(기본값)
     */
    readonly N: "N";
};
/**
 * 신용카드 쿠폰 자동 적용 여부 (Y: 사전 등록된 선 할인 쿠폰을 자동 적용 / N: 쿠폰 미적용(기본값))
 *
 * 할부 거래 요청 시 할인 적용 후 승인 금액이 할부 가능 금액 (50,000) 미만인 경우 인증 실패 처리
 */
export type NiceV2DirectCoupon = (typeof NiceV2DirectCoupon)[keyof typeof NiceV2DirectCoupon];
