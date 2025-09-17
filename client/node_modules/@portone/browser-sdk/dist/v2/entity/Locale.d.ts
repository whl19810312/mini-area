/**
 * **UI 언어**
 *
 * KG이니시스, 스마트로, KSNET, 웰컴페이먼츠 (PC), 한국결제네트웍스, 엑심베이에서 설정 가능하며, PG마다 지원하는 언어 목록은 차이가 있습니다.
 */
export declare const Locale: {
    /**
     * 한국어
     *
     * - KG이니시스
     * - 스마트로
     * - KSNET
     * - 웰컴페이먼츠 (PC)
     * - 한국결제네트웍스
     * - 엑심베이
     */
    readonly KO_KR: "KO_KR";
    /**
     * 영어
     *
     * - KG이니시스
     * - 스마트로
     * - KSNET
     * - 웰컴페이먼츠 (PC)
     * - 한국결제네트웍스
     * - 엑심베이
     */
    readonly EN_US: "EN_US";
    /**
     * 중국어 (중국 본토)
     *
     * - KG이니시스 (PC)
     * - 웰컴페이먼츠 (PC)
     * - 엑심베이
     */
    readonly ZH_CN: "ZH_CN";
    /**
     * 중국어 (대만)
     *
     * - 엑심베이
     */
    readonly ZH_TW: "ZH_TW";
    /**
     * 일본어
     *
     * - 엑심베이
     */
    readonly JA_JP: "JA_JP";
    /**
     * 러시아어
     *
     * - 엑심베이
     */
    readonly RU_RU: "RU_RU";
    /**
     * 타이어
     *
     * - 엑심베이
     */
    readonly TH_TH: "TH_TH";
    /**
     * 베트남어
     *
     * - 엑심베이
     */
    readonly VI_VN: "VI_VN";
};
/**
 * **UI 언어**
 *
 * KG이니시스, 스마트로, KSNET, 웰컴페이먼츠 (PC), 한국결제네트웍스, 엑심베이에서 설정 가능하며, PG마다 지원하는 언어 목록은 차이가 있습니다.
 */
export type Locale = (typeof Locale)[keyof typeof Locale];
