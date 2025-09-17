import type { PaypalV2PayerTaxInfo } from './PaypalV2PayerTaxInfo.js';
import type { PaypalV2PayerAddress } from './PaypalV2PayerAddress.js';
export type PaypalV2Payer = {
    /**
     * 구매자 정보
     */
    tax_info?: PaypalV2PayerTaxInfo | undefined;
    address?: PaypalV2PayerAddress | undefined;
};
