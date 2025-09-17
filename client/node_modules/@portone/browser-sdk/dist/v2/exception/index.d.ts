export interface PortOneError extends Error {
    __portOneErrorType: string;
}
export declare function isPortOneError(error: unknown): error is PortOneError;
export * from './CheckoutServiceErrorCode.js';
export * from './GrpcErrorCode.js';
export * from './TxServiceIdentityVerificationErrorCode.js';
export * from './TxServiceIssueErrorCode.js';
export * from './TxServicePayErrorCode.js';
export * from './IdentityVerificationError.js';
export * from './IssueBillingKeyAndPayError.js';
export * from './IssueBillingKeyError.js';
export * from './ModuleError.js';
export * from './PaymentError.js';
export * from './LoadIssueBillingKeyUIError.js';
export * from './LoadPaymentUIError.js';
