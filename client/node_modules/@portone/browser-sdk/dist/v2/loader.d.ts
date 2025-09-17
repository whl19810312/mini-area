import type { PaymentRequest } from './request/PaymentRequest.js';
import type { PaymentResponse } from './response/PaymentResponse.js';
import type { IdentityVerificationRequest } from './request/IdentityVerificationRequest.js';
import type { IdentityVerificationResponse } from './response/IdentityVerificationResponse.js';
import type { IssueBillingKeyAndPayRequest } from './request/IssueBillingKeyAndPayRequest.js';
import type { IssueBillingKeyAndPayResponse } from './response/IssueBillingKeyAndPayResponse.js';
import type { IssueBillingKeyRequest } from './request/IssueBillingKeyRequest.js';
import type { IssueBillingKeyResponse } from './response/IssueBillingKeyResponse.js';
import type { LoadPaymentUIRequest } from './request/LoadPaymentUIRequest.js';
import type { PaymentError } from './exception/PaymentError.js';
import type { LoadIssueBillingKeyUIRequest } from './request/LoadIssueBillingKeyUIRequest.js';
import type { IssueBillingKeyError } from './exception/IssueBillingKeyError.js';
interface PortOne {
    requestPayment(request: PaymentRequest): Promise<PaymentResponse | undefined>;
    requestIdentityVerification(request: IdentityVerificationRequest): Promise<IdentityVerificationResponse | undefined>;
    requestIssueBillingKeyAndPay(request: IssueBillingKeyAndPayRequest): Promise<IssueBillingKeyAndPayResponse>;
    requestIssueBillingKey(request: IssueBillingKeyRequest): Promise<IssueBillingKeyResponse | undefined>;
    loadPaymentUI(request: LoadPaymentUIRequest, callbacks: {
        onPaymentSuccess: (response: PaymentResponse) => void;
        onPaymentFail: (error: PaymentError) => void;
    }): Promise<void>;
    loadIssueBillingKeyUI(request: LoadIssueBillingKeyUIRequest, callbacks: {
        onIssueBillingKeySuccess: (response: IssueBillingKeyResponse) => void;
        onIssueBillingKeyFail: (error: IssueBillingKeyError) => void;
    }): Promise<void>;
    updateLoadPaymentUIRequest(request: LoadPaymentUIRequest): Promise<void>;
    updateLoadIssueBillingKeyUIRequest(request: LoadIssueBillingKeyUIRequest): Promise<void>;
}
declare global {
    interface Window {
        PortOne: PortOne | undefined;
    }
}
export declare function loadScript(): Promise<PortOne>;
export declare function setPortOneJsSdkUrl(url: string): string;
export {};
