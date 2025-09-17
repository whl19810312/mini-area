/**
 * 가상계좌, 계좌이체 시 현금영수증 노출 여부
 */
export declare const KcpV2DispTax: {
    readonly Y: "Y";
    readonly N: "N";
    readonly R: "R";
    readonly E: "E";
};
/**
 * 가상계좌, 계좌이체 시 현금영수증 노출 여부
 */
export type KcpV2DispTax = (typeof KcpV2DispTax)[keyof typeof KcpV2DispTax];
