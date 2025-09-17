export declare const KpnCardSelect: {
    /**
     * 해외카드
     */
    readonly GLOBAL: "GLOBAL";
    /**
     * 11Pay
     */
    readonly '11PAY': "11PAY";
    /**
     * 구인증
     */
    readonly LEGACY_AUTH: "LEGACY_AUTH";
    /**
     * 키인
     */
    readonly KEY_IN: "KEY_IN";
};
export type KpnCardSelect = (typeof KpnCardSelect)[keyof typeof KpnCardSelect];
