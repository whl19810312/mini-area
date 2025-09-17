/**
 * 개인/법인카드 선택 옵션
 */
export declare const InicisV2CardUse: {
    /**
     * 개인카드만 선택 가능
     */
    readonly percard: "percard";
    /**
     * 법인 카드만 선택 가능
     */
    readonly cocard: "cocard";
};
/**
 * 개인/법인카드 선택 옵션
 */
export type InicisV2CardUse = (typeof InicisV2CardUse)[keyof typeof InicisV2CardUse];
