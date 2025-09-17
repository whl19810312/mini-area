/**
 * **단독 노출할 인증 업체 코드**
 *
 * 인증 업체 선택 화면 없이 설정한 인증 업체를 통해 인증하도록 합니다.
 */
export declare const InicisUnifiedDirectAgency: {
    /**
     * 페이코
     */
    readonly PAYCO: "PAYCO";
    /**
     * 패스 (통신사)
     */
    readonly PASS: "PASS";
    /**
     * 토스
     */
    readonly TOSS: "TOSS";
    /**
     * 금융결제원
     */
    readonly KFTC: "KFTC";
    /**
     * 카카오
     */
    readonly KAKAO: "KAKAO";
    /**
     * 네이버
     */
    readonly NAVER: "NAVER";
    /**
     * 삼성패스
     */
    readonly SAMSUNG: "SAMSUNG";
    /**
     * 신한은행
     */
    readonly SHINHAN: "SHINHAN";
    /**
     * 국민은행
     */
    readonly KB: "KB";
    /**
     * 하나은행
     */
    readonly HANA: "HANA";
    /**
     * 우리은행
     */
    readonly WOORI: "WOORI";
    /**
     * 농협은행
     */
    readonly NH: "NH";
    /**
     * 카카오뱅크
     */
    readonly KAKAOBANK: "KAKAOBANK";
    /**
     * 휴대폰 인증, 별도 계약 필요
     */
    readonly SMS: "SMS";
};
/**
 * **단독 노출할 인증 업체 코드**
 *
 * 인증 업체 선택 화면 없이 설정한 인증 업체를 통해 인증하도록 합니다.
 */
export type InicisUnifiedDirectAgency = (typeof InicisUnifiedDirectAgency)[keyof typeof InicisUnifiedDirectAgency];
