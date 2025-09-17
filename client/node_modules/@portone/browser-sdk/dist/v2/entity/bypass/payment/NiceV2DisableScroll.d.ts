/**
 * 결제창 스크롤 미사용 여부 (PC Only, Y: 미사용 / N(default): 사용)
 */
export declare const NiceV2DisableScroll: {
    readonly Y: "Y";
    readonly N: "N";
};
/**
 * 결제창 스크롤 미사용 여부 (PC Only, Y: 미사용 / N(default): 사용)
 */
export type NiceV2DisableScroll = (typeof NiceV2DisableScroll)[keyof typeof NiceV2DisableScroll];
