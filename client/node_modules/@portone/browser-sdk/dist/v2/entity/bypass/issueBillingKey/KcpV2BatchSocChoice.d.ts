/**
 * 결제창에서 주민번호/사업자 번호 고정여부 설정
 */
export declare const KcpV2BatchSocChoice: {
    /**
     * 주민번호만 표시
     */
    readonly S: "S";
    /**
     * 사업자번호만 표시
     */
    readonly C: "C";
};
/**
 * 결제창에서 주민번호/사업자 번호 고정여부 설정
 */
export type KcpV2BatchSocChoice = (typeof KcpV2BatchSocChoice)[keyof typeof KcpV2BatchSocChoice];
