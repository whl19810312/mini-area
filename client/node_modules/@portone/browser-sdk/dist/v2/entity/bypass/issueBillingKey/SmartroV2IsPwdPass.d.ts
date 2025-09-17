/**
 * 결제 비밀번호 등록 Skip 여부
 */
export declare const SmartroV2IsPwdPass: {
    /**
     * 비밀번호 설정 미사용
     */
    readonly Y: "Y";
    /**
     * 비밀번호 설정 사용
     */
    readonly N: "N";
};
/**
 * 결제 비밀번호 등록 Skip 여부
 */
export type SmartroV2IsPwdPass = (typeof SmartroV2IsPwdPass)[keyof typeof SmartroV2IsPwdPass];
