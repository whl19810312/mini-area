/**
 * 다이렉트 호출 결제 수단 (BANK: 계좌이체/CELLPHONE: 휴대폰 소액결제)
 */
export declare const NiceV2DirectShow: {
    /**
     * 계좌이체
     */
    readonly BANK: "BANK";
    /**
     * 휴대폰 소액결제
     */
    readonly CELLPHONE: "CELLPHONE";
};
/**
 * 다이렉트 호출 결제 수단 (BANK: 계좌이체/CELLPHONE: 휴대폰 소액결제)
 */
export type NiceV2DirectShow = (typeof NiceV2DirectShow)[keyof typeof NiceV2DirectShow];
