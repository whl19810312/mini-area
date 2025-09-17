import type { PaypalV2PurchaseUnit } from '../loadPaymentUI/PaypalV2PurchaseUnit.js';
import type { PaypalV2Payer } from '../loadPaymentUI/PaypalV2Payer.js';
import type { PaypalV2PaymentSource } from './PaypalV2PaymentSource.js';
import type { PaypalV2AdditionalData } from '../loadPaymentUI/PaypalV2AdditionalData.js';
/**
 * **Paypal bypass 파라미터**
 */
export type PaypalV2PaymentBypass = {
    /**
     * create order API 호출에 필요한 파라미터
     */
    purchase_units?: PaypalV2PurchaseUnit[] | undefined;
    payer?: PaypalV2Payer | undefined;
    payment_source?: PaypalV2PaymentSource | undefined;
    /**
     * STC 파라미터
     */
    additional_data?: PaypalV2AdditionalData[] | undefined;
};
