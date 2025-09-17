/**
 * **결제 금액**
 *
 * 결제 금액을 정수로 나타냅니다.
 *
 * 해외 통화의 경우 통화의 최소 단위(minor unit)를 기준으로 합니다. 예를 들어, USD의 최소 단위는 센트(0.01 USD)이므로, 6 USD의 경우 100배하여 600으로 입력합니다.
 *
 * 최소 단위는 [ISO 4217](https://www.iso.org/iso-4217-currency-codes.html)에 표준화된 것을 기준으로 합니다.
 *
 * - KRW: 1배
 * - USD: 100배
 * - JPY: 1배
 */
export type PaymentTotalAmount = number;
