import type { PaymentRequest } from './request/PaymentRequest.js';
import type { PaymentResponse } from './response/PaymentResponse.js';
export declare function requestPayment(request: PaymentRequest): Promise<PaymentResponse | undefined>;
