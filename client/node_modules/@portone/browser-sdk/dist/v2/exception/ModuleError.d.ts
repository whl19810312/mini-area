import { PortOneError } from './index.js';
import { CheckoutServiceErrorCode } from './CheckoutServiceErrorCode.js';
import { GrpcErrorCode } from './GrpcErrorCode.js';
export declare function isModuleError(error: unknown): error is ModuleError;
/**
 * **오류 코드**
 */
export type ModuleErrorCode = CheckoutServiceErrorCode | GrpcErrorCode;
export declare class ModuleError extends Error implements PortOneError {
    static [Symbol.hasInstance](instance: unknown): boolean;
    __portOneErrorType: string;
    /**
     * **오류 코드**
     */
    code: ModuleErrorCode;
    /**
     * **오류 메시지**
     *
     * 실패한 경우 오류 메시지입니다.
     */
    message: string;
    constructor({ code, message, }: {
        /**
         * **오류 코드**
         */
        code: ModuleErrorCode;
        /**
         * **오류 메시지**
         *
         * 실패한 경우 오류 메시지입니다.
         */
        message: string;
    });
}
