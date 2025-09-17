/**
 * **결제수단 구분코드**
 *
 * PG사별 지원되는 결제수단이 모두 상이합니다.
 *
 * [각 PG사별 결제 연동 가이드](https://developers.portone.io/opi/ko/integration/pg/v2/readme?v=v2)를 참고하세요
 */
export declare const PaymentPayMethod: {
    /**
     * 카드
     */
    readonly CARD: "CARD";
    /**
     * 가상계좌
     */
    readonly VIRTUAL_ACCOUNT: "VIRTUAL_ACCOUNT";
    /**
     * 계좌이체
     */
    readonly TRANSFER: "TRANSFER";
    /**
     * 휴대폰 소액결제
     */
    readonly MOBILE: "MOBILE";
    /**
     * 상품권
     */
    readonly GIFT_CERTIFICATE: "GIFT_CERTIFICATE";
    /**
     * 간편 결제
     */
    readonly EASY_PAY: "EASY_PAY";
    /**
     * 페이팔(SPB)
     */
    readonly PAYPAL: "PAYPAL";
    /**
     * 알리페이
     */
    readonly ALIPAY: "ALIPAY";
    /**
     * 편의점 결제
     */
    readonly CONVENIENCE_STORE: "CONVENIENCE_STORE";
};
/**
 * **결제수단 구분코드**
 *
 * PG사별 지원되는 결제수단이 모두 상이합니다.
 *
 * [각 PG사별 결제 연동 가이드](https://developers.portone.io/opi/ko/integration/pg/v2/readme?v=v2)를 참고하세요
 */
export type PaymentPayMethod = (typeof PaymentPayMethod)[keyof typeof PaymentPayMethod];
