import type { LoadPaymentUIRequest } from './request/LoadPaymentUIRequest.js';
import type { PaymentResponse } from './response/PaymentResponse.js';
import type { PaymentError } from './exception/PaymentError.js';
export declare function loadPaymentUI(request: LoadPaymentUIRequest, callbacks: {
    onPaymentSuccess: (response: PaymentResponse) => void;
    onPaymentFail: (error: PaymentError) => void;
}): Promise<void>;
