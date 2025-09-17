/**
 * 결제 상품 유입경로
 */
export declare const NaverpayProductItemPayReferrer: {
    readonly NAVER_BOOK: "NAVER_BOOK";
    readonly NAVER_MUSIC: "NAVER_MUSIC";
    readonly NAVER_SHOPPING: "NAVER_SHOPPING";
    readonly NAVER_MAP: "NAVER_MAP";
    readonly NAVER_PLACE: "NAVER_PLACE";
    readonly SEARCH_AD: "SEARCH_AD";
    readonly NAVER_SEARCH: "NAVER_SEARCH";
    readonly BRAND_SEARCH: "BRAND_SEARCH";
    readonly PARTNER_DIRECT: "PARTNER_DIRECT";
    readonly ETC: "ETC";
};
/**
 * 결제 상품 유입경로
 */
export type NaverpayProductItemPayReferrer = (typeof NaverpayProductItemPayReferrer)[keyof typeof NaverpayProductItemPayReferrer];
