import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
import { TxServiceIdentityVerificationErrorCode } from './TxServiceIdentityVerificationErrorCode.js';
import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
export declare function isIdentityVerificationError(error: unknown): error is IdentityVerificationError;
/**
 * **오류 코드**
 *
 * - 실패한 경우 오류 코드입니다.
 */
export type IdentityVerificationErrorCode = CheckoutServiceErrorCode | GrpcErrorCode | TxServiceIdentityVerificationErrorCode;
export declare class IdentityVerificationError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    transactionType: string;
    /**
     * **오류 코드**
     *
     * - 실패한 경우 오류 코드입니다.
     */
    code: IdentityVerificationErrorCode;
    /**
     * **오류 메시지**
     *
     * - 실패한 경우 오류 메시지입니다.
     */
    message: string;
    identityVerificationId?: string | undefined;
    identityVerificationTxId?: string | undefined;
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
    constructor({ code, message, identityVerificationId, identityVerificationTxId, pgCode, pgMessage, }: {
        /**
         * **오류 코드**
         *
         * - 실패한 경우 오류 코드입니다.
         */
        code: IdentityVerificationErrorCode;
        /**
         * **오류 메시지**
         *
         * - 실패한 경우 오류 메시지입니다.
         */
        message: string;
        identityVerificationId?: string | undefined;
        identityVerificationTxId?: string | undefined;
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
