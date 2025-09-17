/**
 * 삼성페이 고객사 유형 (01: 삼성페이 內 쇼핑 / 99: 기타 (기본값))
 */
export declare const NiceV2SamPayMallType: {
    /**
     * 삼성페이 內 쇼핑
     */
    readonly '01': "01";
    /**
     * 기타 (기본값)
     */
    readonly '99': "99";
};
/**
 * 삼성페이 고객사 유형 (01: 삼성페이 內 쇼핑 / 99: 기타 (기본값))
 */
export type NiceV2SamPayMallType = (typeof NiceV2SamPayMallType)[keyof typeof NiceV2SamPayMallType];
