/**
 * 카드 결제시 사용되는 카드사 코드
 */
export declare const CardCompany: {
    /**
     * KDB산업은행 카드
     */
    readonly KOREA_DEVELOPMENT_BANK: "KOREA_DEVELOPMENT_BANK";
    /**
     * 새마을금고 카드
     */
    readonly KFCC: "KFCC";
    /**
     * 신협 카드
     */
    readonly SHINHYUP: "SHINHYUP";
    /**
     * 우체국 카드
     */
    readonly EPOST: "EPOST";
    /**
     * 저축은행 카드
     */
    readonly SAVINGS_BANK_KOREA: "SAVINGS_BANK_KOREA";
    /**
     * 카카오뱅크 카드
     */
    readonly KAKAO_BANK: "KAKAO_BANK";
    /**
     * 우리카드
     */
    readonly WOORI_CARD: "WOORI_CARD";
    /**
     * BC카드
     */
    readonly BC_CARD: "BC_CARD";
    /**
     * 광주카드
     */
    readonly GWANGJU_CARD: "GWANGJU_CARD";
    /**
     * 삼성카드
     */
    readonly SAMSUNG_CARD: "SAMSUNG_CARD";
    /**
     * 신한카드
     */
    readonly SHINHAN_CARD: "SHINHAN_CARD";
    /**
     * 현대카드
     */
    readonly HYUNDAI_CARD: "HYUNDAI_CARD";
    /**
     * 롯데카드
     */
    readonly LOTTE_CARD: "LOTTE_CARD";
    /**
     * 수협카드
     */
    readonly SUHYUP_CARD: "SUHYUP_CARD";
    /**
     * 씨티카드
     */
    readonly CITI_CARD: "CITI_CARD";
    /**
     * NH 농협카드
     */
    readonly NH_CARD: "NH_CARD";
    /**
     * 전북카드
     */
    readonly JEONBUK_CARD: "JEONBUK_CARD";
    /**
     * 제주카드
     */
    readonly JEJU_CARD: "JEJU_CARD";
    /**
     * 하나카드
     */
    readonly HANA_CARD: "HANA_CARD";
    /**
     * 국민카드
     */
    readonly KOOKMIN_CARD: "KOOKMIN_CARD";
    /**
     * K뱅크 카드
     */
    readonly K_BANK: "K_BANK";
    /**
     * 토스뱅크 카드
     */
    readonly TOSS_BANK: "TOSS_BANK";
    /**
     * 미래에셋증권 카드
     */
    readonly MIRAE_ASSET_SECURITIES: "MIRAE_ASSET_SECURITIES";
};
/**
 * 카드 결제시 사용되는 카드사 코드
 */
export type CardCompany = (typeof CardCompany)[keyof typeof CardCompany] | `CARD_COMPANY_${(typeof CardCompany)[keyof typeof CardCompany]}`;
