import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
import { TxServicePayErrorCode } from './TxServicePayErrorCode.js';
export declare function isLoadPaymentUIError(error: unknown): error is LoadPaymentUIError;
/**
 * **오류 코드**
 *
 * 실패한 경우 오류 코드입니다.
 */
export type LoadPaymentUIErrorCode = CheckoutServiceErrorCode | GrpcErrorCode | TxServicePayErrorCode;
export declare class LoadPaymentUIError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    transactionType: string;
    /**
     * **오류 코드**
     *
     * 실패한 경우 오류 코드입니다.
     */
    code: LoadPaymentUIErrorCode;
    /**
     * **오류 메시지**
     *
     * 실패한 경우 오류 메시지입니다.
     */
    message: string;
    constructor({ code, message, }: {
        /**
         * **오류 코드**
         *
         * 실패한 경우 오류 코드입니다.
         */
        code: LoadPaymentUIErrorCode;
        /**
         * **오류 메시지**
         *
         * 실패한 경우 오류 메시지입니다.
         */
        message: string;
    });
}
