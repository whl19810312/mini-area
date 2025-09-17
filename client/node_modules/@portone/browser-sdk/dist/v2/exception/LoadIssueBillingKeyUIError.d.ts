import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
import { TxServiceIssueErrorCode } from './TxServiceIssueErrorCode.js';
export declare function isLoadIssueBillingKeyUIError(error: unknown): error is LoadIssueBillingKeyUIError;
/**
 * **오류 코드**
 *
 * 실패한 경우 오류 코드입니다.
 */
export type LoadIssueBillingKeyUIErrorCode = CheckoutServiceErrorCode | GrpcErrorCode | TxServiceIssueErrorCode;
export declare class LoadIssueBillingKeyUIError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    transactionType: string;
    /**
     * **오류 코드**
     *
     * 실패한 경우 오류 코드입니다.
     */
    code: LoadIssueBillingKeyUIErrorCode;
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
        code: LoadIssueBillingKeyUIErrorCode;
        /**
         * **오류 메시지**
         *
         * 실패한 경우 오류 메시지입니다.
         */
        message: string;
    });
}
