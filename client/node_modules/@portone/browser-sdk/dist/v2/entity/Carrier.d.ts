/**
 * 통신사 코드
 */
export declare const Carrier: {
    /**
     * SK텔레콤
     */
    readonly SKT: "SKT";
    /**
     * KT
     */
    readonly KT: "KT";
    /**
     * LG U+
     */
    readonly LGU: "LGU";
    /**
     * 헬로모바일
     */
    readonly HELLO: "HELLO";
    /**
     * 티플러스
     */
    readonly KCT: "KCT";
    /**
     * SK 7mobile
     */
    readonly SK7: "SK7";
};
/**
 * 통신사 코드
 */
export type Carrier = (typeof Carrier)[keyof typeof Carrier] | `CARRIER_${(typeof Carrier)[keyof typeof Carrier]}`;
