import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
import { TxServiceIssueErrorCode } from './TxServiceIssueErrorCode.js';
import { TxServicePayErrorCode } from './TxServicePayErrorCode.js';
import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
export declare function isIssueBillingKeyAndPayError(error: unknown): error is IssueBillingKeyAndPayError;
/**
 * **오류 코드**
 *
 * 실패한 경우 오류 코드입니다.
 */
export type IssueBillingKeyAndPayErrorCode = CheckoutServiceErrorCode | GrpcErrorCode | TxServiceIssueErrorCode | TxServicePayErrorCode;
export declare class IssueBillingKeyAndPayError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    transactionType: string;
    txId?: string | undefined;
    paymentId?: string | undefined;
    billingKey?: string | undefined;
    /**
     * **오류 코드**
     *
     * 실패한 경우 오류 코드입니다.
     */
    code: IssueBillingKeyAndPayErrorCode;
    /**
     * **오류 메시지**
     *
     * 실패한 경우 오류 메시지입니다.
     */
    message: string;
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
    constructor({ txId, paymentId, billingKey, code, message, pgCode, pgMessage, }: {
        txId?: string | undefined;
        paymentId?: string | undefined;
        billingKey?: string | undefined;
        /**
         * **오류 코드**
         *
         * 실패한 경우 오류 코드입니다.
         */
        code: IssueBillingKeyAndPayErrorCode;
        /**
         * **오류 메시지**
         *
         * 실패한 경우 오류 메시지입니다.
         */
        message: string;
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
