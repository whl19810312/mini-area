import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
import { TxServicePayErrorCode } from './TxServicePayErrorCode.js';
import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
export declare function isPaymentError(error: unknown): error is PaymentError;
/**
 * **오류 코드**
 *
 * 실패한 경우 오류 코드입니다.
 */
export type PaymentErrorCode = CheckoutServiceErrorCode | GrpcErrorCode | TxServicePayErrorCode;
export declare class PaymentError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    transactionType: string;
    /**
     * **오류 코드**
     *
     * 실패한 경우 오류 코드입니다.
     */
    code: PaymentErrorCode;
    /**
     * **오류 메시지**
     *
     * 실패한 경우 오류 메시지입니다.
     */
    message: string;
    txId?: string | undefined;
    paymentId?: string | undefined;
    /**
     * **PG 오류 코드**
     *
     * PG에서 오류 코드를 내려 주는 경우 이 오류 코드를 그대로 반환합니다.
     */
    pgCode?: PgCode | undefined;
    /**
     * **PG 오류 메시지**
     *
     * PG에서 오류 메시지를 내려 주는 경우 이 오류 메시지를 그대로 반환합니다.
     */
    pgMessage?: PgMessage | undefined;
    constructor({ code, message, txId, paymentId, pgCode, pgMessage, }: {
        /**
         * **오류 코드**
         *
         * 실패한 경우 오류 코드입니다.
         */
        code: PaymentErrorCode;
        /**
         * **오류 메시지**
         *
         * 실패한 경우 오류 메시지입니다.
         */
        message: string;
        txId?: string | undefined;
        paymentId?: string | undefined;
        /**
         * **PG 오류 코드**
         *
         * PG에서 오류 코드를 내려 주는 경우 이 오류 코드를 그대로 반환합니다.
         */
        pgCode?: PgCode | undefined;
        /**
         * **PG 오류 메시지**
         *
         * PG에서 오류 메시지를 내려 주는 경우 이 오류 메시지를 그대로 반환합니다.
         */
        pgMessage?: PgMessage | undefined;
    });
}
