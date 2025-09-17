/**
 * 해외 카드만 결제를 허용할지 여부(기본값: `"KR"`)
 *
 * `"KR"`, `"EN"` 중 하나의 값으로 입력해주세요.
 */
export declare const SmartroV2OpenType: {
    readonly KR: "KR";
    readonly EN: "EN";
};
/**
 * 해외 카드만 결제를 허용할지 여부(기본값: `"KR"`)
 *
 * `"KR"`, `"EN"` 중 하나의 값으로 입력해주세요.
 */
export type SmartroV2OpenType = (typeof SmartroV2OpenType)[keyof typeof SmartroV2OpenType];
