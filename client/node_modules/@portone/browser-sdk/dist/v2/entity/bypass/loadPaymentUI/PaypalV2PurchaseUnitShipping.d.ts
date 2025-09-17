import type { PaypalV2PurchaseUnitShippingAddress } from './PaypalV2PurchaseUnitShippingAddress.js';
/**
 * 구매 상품 정보
 */
export type PaypalV2PurchaseUnitShipping = {
    /**
     * 수령지 정보
     */
    address?: PaypalV2PurchaseUnitShippingAddress | undefined;
};
