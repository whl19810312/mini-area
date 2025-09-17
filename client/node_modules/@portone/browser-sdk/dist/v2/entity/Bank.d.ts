/**
 * 가상계좌 발급시 사용되는 은행 코드
 */
export declare const Bank: {
    /**
     * 한국은행
     */
    readonly BANK_OF_KOREA: "BANK_OF_KOREA";
    /**
     * 산업은행
     */
    readonly KOREA_DEVELOPMENT_BANK: "KOREA_DEVELOPMENT_BANK";
    /**
     * 기업은행
     *
     * - KCP
     * - 스마트로
     */
    readonly INDUSTRIAL_BANK_OF_KOREA: "INDUSTRIAL_BANK_OF_KOREA";
    /**
     * 국민은행
     *
     * - KCP
     * - 스마트로
     */
    readonly KOOKMIN_BANK: "KOOKMIN_BANK";
    /**
     * 수협은행
     *
     * - KCP
     * - 스마트로
     */
    readonly SUHYUP_BANK: "SUHYUP_BANK";
    /**
     * 수출입은행
     */
    readonly EXPORT_IMPORT_BANK_OF_KOREA: "EXPORT_IMPORT_BANK_OF_KOREA";
    /**
     * NH농협은행
     *
     * - KCP
     * - 스마트로
     */
    readonly NH_NONGHYUP_BANK: "NH_NONGHYUP_BANK";
    /**
     * 지역농․축협
     */
    readonly LOCAL_NONGHYUP: "LOCAL_NONGHYUP";
    /**
     * 우리은행
     *
     * - KCP
     * - 스마트로
     */
    readonly WOORI_BANK: "WOORI_BANK";
    /**
     * SC제일은행
     *
     * - KCP
     * - 스마트로
     */
    readonly SC_BANK_KOREA: "SC_BANK_KOREA";
    /**
     * 한국씨티은행
     */
    readonly CITI_BANK_KOREA: "CITI_BANK_KOREA";
    /**
     * 대구은행
     *
     * - KCP
     * - 스마트로
     */
    readonly DAEGU_BANK: "DAEGU_BANK";
    /**
     * 부산은행
     *
     * - KCP
     * - 스마트로
     */
    readonly BUSAN_BANK: "BUSAN_BANK";
    /**
     * 광주은행
     *
     * - KCP
     * - 스마트로
     */
    readonly GWANGJU_BANK: "GWANGJU_BANK";
    /**
     * 제주은행
     */
    readonly JEJU_BANK: "JEJU_BANK";
    /**
     * 전북은행
     *
     * - 스마트로
     */
    readonly JEONBUK_BANK: "JEONBUK_BANK";
    /**
     * 경남은행
     *
     * - KCP
     * - 스마트로
     */
    readonly KYONGNAM_BANK: "KYONGNAM_BANK";
    /**
     * 새마을금고
     */
    readonly KFCC: "KFCC";
    /**
     * 신협
     */
    readonly SHINHYUP: "SHINHYUP";
    /**
     * 저축은행
     */
    readonly SAVINGS_BANK_KOREA: "SAVINGS_BANK_KOREA";
    /**
     * 모건스탠리은행
     */
    readonly MORGAN_STANLEY_BANK: "MORGAN_STANLEY_BANK";
    /**
     * HSBC은행
     */
    readonly HSBC_BANK: "HSBC_BANK";
    /**
     * 도이치은행
     */
    readonly DEUTSCHE_BANK: "DEUTSCHE_BANK";
    /**
     * 제이피모간체이스은행
     */
    readonly JP_MORGAN_CHASE_BANK: "JP_MORGAN_CHASE_BANK";
    /**
     * 미즈호은행
     */
    readonly MIZUHO_BANK: "MIZUHO_BANK";
    /**
     * 엠유에프지은행
     */
    readonly MUFG_BANK: "MUFG_BANK";
    /**
     * BOA은행
     */
    readonly BANK_OF_AMERICA_BANK: "BANK_OF_AMERICA_BANK";
    /**
     * 비엔피파리바은행
     */
    readonly BNP_PARIBAS_BANK: "BNP_PARIBAS_BANK";
    /**
     * 중국공상은행
     */
    readonly ICBC: "ICBC";
    /**
     * 중국은행
     */
    readonly BANK_OF_CHINA: "BANK_OF_CHINA";
    /**
     * 산림조합중앙회
     */
    readonly NATIONAL_FORESTRY_COOPERATIVE_FEDERATION: "NATIONAL_FORESTRY_COOPERATIVE_FEDERATION";
    /**
     * 대화은행
     */
    readonly UNITED_OVERSEAS_BANK: "UNITED_OVERSEAS_BANK";
    /**
     * 교통은행
     */
    readonly BANK_OF_COMMUNICATIONS: "BANK_OF_COMMUNICATIONS";
    /**
     * 중국건설은행
     */
    readonly CHINA_CONSTRUCTION_BANK: "CHINA_CONSTRUCTION_BANK";
    /**
     * 우체국
     *
     * - KCP
     * - 스마트로
     */
    readonly EPOST: "EPOST";
    /**
     * 신용보증기금
     */
    readonly KODIT: "KODIT";
    /**
     * 기술보증기금
     */
    readonly KIBO: "KIBO";
    /**
     * 하나은행
     *
     * - KCP
     * - 스마트로
     */
    readonly HANA_BANK: "HANA_BANK";
    /**
     * 신한은행
     *
     * - KCP
     * - 스마트로
     */
    readonly SHINHAN_BANK: "SHINHAN_BANK";
    /**
     * 케이뱅크
     *
     * - 스마트로
     */
    readonly K_BANK: "K_BANK";
    /**
     * 카카오뱅크
     */
    readonly KAKAO_BANK: "KAKAO_BANK";
    /**
     * 토스뱅크
     */
    readonly TOSS_BANK: "TOSS_BANK";
    /**
     * 한국신용정보원
     */
    readonly KCIS: "KCIS";
    /**
     * 대신저축은행
     */
    readonly DAISHIN_SAVINGS_BANK: "DAISHIN_SAVINGS_BANK";
    /**
     * 에스비아이저축은행
     */
    readonly SBI_SAVINGS_BANK: "SBI_SAVINGS_BANK";
    /**
     * 에이치케이저축은행
     */
    readonly HK_SAVINGS_BANK: "HK_SAVINGS_BANK";
    /**
     * 웰컴저축은행
     */
    readonly WELCOME_SAVINGS_BANK: "WELCOME_SAVINGS_BANK";
    /**
     * 신한저축은행
     */
    readonly SHINHAN_SAVINGS_BANK: "SHINHAN_SAVINGS_BANK";
    /**
     * 교보증권
     */
    readonly KYOBO_SECURITIES: "KYOBO_SECURITIES";
    /**
     * 대신증권
     */
    readonly DAISHIN_SECURITIES: "DAISHIN_SECURITIES";
    /**
     * 메리츠증권
     */
    readonly MERITZ_SECURITIES: "MERITZ_SECURITIES";
    /**
     * 미래에셋증권
     */
    readonly MIRAE_ASSET_SECURITIES: "MIRAE_ASSET_SECURITIES";
    /**
     * 부국증권
     */
    readonly BOOKOOK_SECURITIES: "BOOKOOK_SECURITIES";
    /**
     * 삼성증권
     */
    readonly SAMSUNG_SECURITIES: "SAMSUNG_SECURITIES";
    /**
     * 신영증권
     */
    readonly SHINYOUNG_SECURITIES: "SHINYOUNG_SECURITIES";
    /**
     * 신한금융투자
     */
    readonly SHINHAN_FINANCIAL_INVESTMENT: "SHINHAN_FINANCIAL_INVESTMENT";
    /**
     * 유안타증권
     */
    readonly YUANTA_SECURITIES: "YUANTA_SECURITIES";
    /**
     * 유진투자증권
     */
    readonly EUGENE_INVESTMENT_SECURITIES: "EUGENE_INVESTMENT_SECURITIES";
    /**
     * 카카오페이증권
     */
    readonly KAKAO_PAY_SECURITIES: "KAKAO_PAY_SECURITIES";
    /**
     * 토스증권
     */
    readonly TOSS_SECURITIES: "TOSS_SECURITIES";
    /**
     * 한국포스증권
     */
    readonly KOREA_FOSS_SECURITIES: "KOREA_FOSS_SECURITIES";
    /**
     * 하나금융투자
     */
    readonly HANA_FINANCIAL_INVESTMENT: "HANA_FINANCIAL_INVESTMENT";
    /**
     * 하이투자증권
     */
    readonly HI_INVESTMENT_SECURITIES: "HI_INVESTMENT_SECURITIES";
    /**
     * 한국투자증권
     */
    readonly KOREA_INVESTMENT_SECURITIES: "KOREA_INVESTMENT_SECURITIES";
    /**
     * 한화투자증권
     */
    readonly HANWHA_INVESTMENT_SECURITIES: "HANWHA_INVESTMENT_SECURITIES";
    /**
     * 현대차증권자
     */
    readonly HYUNDAI_MOTOR_SECURITIES: "HYUNDAI_MOTOR_SECURITIES";
    /**
     * DB금융투자자
     */
    readonly DB_FINANCIAL_INVESTMENT: "DB_FINANCIAL_INVESTMENT";
    /**
     * KB증권
     */
    readonly KB_SECURITIES: "KB_SECURITIES";
    /**
     * KTB투자증권
     */
    readonly KTB_INVESTMENT_SECURITIES: "KTB_INVESTMENT_SECURITIES";
    /**
     * NH투자증권
     */
    readonly NH_INVESTMENT_SECURITIES: "NH_INVESTMENT_SECURITIES";
    /**
     * SK증권
     */
    readonly SK_SECURITIES: "SK_SECURITIES";
    /**
     * 서울보증보험
     */
    readonly SCI: "SCI";
    /**
     * 키움증권
     */
    readonly KIWOOM_SECURITIES: "KIWOOM_SECURITIES";
    /**
     * 이베스트증권
     */
    readonly EBEST_INVESTMENT_SECURITIES: "EBEST_INVESTMENT_SECURITIES";
    /**
     * 케이프투자증권
     */
    readonly CAPE_INVESTMENT_CERTIFICATE: "CAPE_INVESTMENT_CERTIFICATE";
};
/**
 * 가상계좌 발급시 사용되는 은행 코드
 */
export type Bank = (typeof Bank)[keyof typeof Bank] | `BANK_${(typeof Bank)[keyof typeof Bank]}`;
