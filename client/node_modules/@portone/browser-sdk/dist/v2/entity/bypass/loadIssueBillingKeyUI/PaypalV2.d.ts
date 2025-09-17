import type { PaypalV2Style } from './PaypalV2Style.js';
import type { PaypalV2ShippingAddress } from './PaypalV2ShippingAddress.js';
import type { PaypalV2AdditionalData } from './PaypalV2AdditionalData.js';
/**
 * **Paypal bypass 파라미터**
 */
export type PaypalV2LoadIssueBillingKeyUIBypass = {
    /**
     * 페이팔 빌링키 발급 UI 호출 시 필요한 파라미터
     */
    style?: PaypalV2Style | undefined;
    shipping_address?: PaypalV2ShippingAddress | undefined;
    /**
     * STC 파라미터
     */
    additional_data?: PaypalV2AdditionalData[] | undefined;
};
