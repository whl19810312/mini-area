import { PaymentPayMethod } from './PaymentPayMethod.js';
/**
 * **결제수단 구분코드**
 *
 * PG사별 지원되는 결제수단이 모두 상이합니다.
 *
 * [각 PG사별 결제 연동 가이드](https://developers.portone.io/opi/ko/integration/pg/v2/readme?v=v2)를 참고하세요
 */
export declare const PayMethod: {
    readonly CARD: "CARD";
    readonly VIRTUAL_ACCOUNT: "VIRTUAL_ACCOUNT";
    readonly TRANSFER: "TRANSFER";
    readonly MOBILE: "MOBILE";
    readonly GIFT_CERTIFICATE: "GIFT_CERTIFICATE";
    readonly EASY_PAY: "EASY_PAY";
    readonly PAYPAL: "PAYPAL";
    readonly ALIPAY: "ALIPAY";
    readonly CONVENIENCE_STORE: "CONVENIENCE_STORE";
};
/**
 * **결제수단 구분코드**
 *
 * PG사별 지원되는 결제수단이 모두 상이합니다.
 *
 * [각 PG사별 결제 연동 가이드](https://developers.portone.io/opi/ko/integration/pg/v2/readme?v=v2)를 참고하세요
 */
export type PayMethod = PaymentPayMethod;
