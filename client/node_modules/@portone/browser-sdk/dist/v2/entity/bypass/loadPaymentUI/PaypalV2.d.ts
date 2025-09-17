import type { PaypalV2Style } from './PaypalV2Style.js';
import type { PaypalV2PurchaseUnit } from './PaypalV2PurchaseUnit.js';
import type { PaypalV2Payer } from './PaypalV2Payer.js';
import type { PaypalV2AdditionalData } from './PaypalV2AdditionalData.js';
/**
 * **Paypal bypass 파라미터**
 */
export type PaypalV2LoadPaymentUIBypass = {
    /**
     * SPB 버튼 렌더링에 필요한 파라미터
     */
    style?: PaypalV2Style | undefined;
    /**
     * 허용할 결제 수단 (예: "card, credit, bancontact")
     */
    'enable-funding'?: string | undefined;
    /**
     * 차단할 결제 수단 (예: "venmo, mercadopago")
     */
    'disable-funding'?: string | undefined;
    /**
     * create order API 호출에 필요한 파라미터
     */
    purchase_units?: PaypalV2PurchaseUnit[] | undefined;
    payer?: PaypalV2Payer | undefined;
    /**
     * STC 파라미터
     */
    additional_data?: PaypalV2AdditionalData[] | undefined;
};
