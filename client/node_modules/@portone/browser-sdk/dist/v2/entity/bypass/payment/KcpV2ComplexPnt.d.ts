/**
 * 포인트 결제의 경우 신용카드 + 포인트 결제인데, N으로 설정 시 포인트로만 결제가 이루어짐
 */
export declare const KcpV2ComplexPnt: {
    readonly Y: "Y";
    readonly N: "N";
};
/**
 * 포인트 결제의 경우 신용카드 + 포인트 결제인데, N으로 설정 시 포인트로만 결제가 이루어짐
 */
export type KcpV2ComplexPnt = (typeof KcpV2ComplexPnt)[keyof typeof KcpV2ComplexPnt];
