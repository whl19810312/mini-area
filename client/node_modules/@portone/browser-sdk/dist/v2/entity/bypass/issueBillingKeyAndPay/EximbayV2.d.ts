import type { EximbayV2Payment } from './EximbayV2Payment.js';
import type { EximbayV2Merchant } from './EximbayV2Merchant.js';
import type { EximbayV2Surcharge } from './EximbayV2Surcharge.js';
import type { EximbayV2ShipTo } from './EximbayV2ShipTo.js';
import type { EximbayV2BillTo } from './EximbayV2BillTo.js';
/**
 * **엑심베이 bypass 파라미터**
 */
export type EximbayV2IssueBillingKeyAndPayBypass = {
    /**
     * 결제 정보
     */
    payment?: EximbayV2Payment | undefined;
    merchant?: EximbayV2Merchant | undefined;
    /**
     * **최대 3개의 추가 비용 목록**
     */
    surcharge?: EximbayV2Surcharge[] | undefined;
    /**
     * **배송지 정보**
     */
    shipTo?: EximbayV2ShipTo | undefined;
    /**
     * **청구지 정보**
     */
    billTo?: EximbayV2BillTo | undefined;
};
