/**
 * 구매자 성별
 */
export declare const Gender: {
    /**
     * 남성
     */
    readonly MALE: "MALE";
    /**
     * 여성
     */
    readonly FEMALE: "FEMALE";
    /**
     * 기타
     */
    readonly OTHER: "OTHER";
};
/**
 * 구매자 성별
 */
export type Gender = (typeof Gender)[keyof typeof Gender] | `GENDER_${(typeof Gender)[keyof typeof Gender]}`;
