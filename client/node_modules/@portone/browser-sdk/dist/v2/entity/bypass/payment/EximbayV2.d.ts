import type { EximbayV2Payment } from './EximbayV2Payment.js';
import type { EximbayV2Merchant } from './EximbayV2Merchant.js';
import type { EximbayV2Tax } from './EximbayV2Tax.js';
import type { EximbayV2Surcharge } from './EximbayV2Surcharge.js';
import type { EximbayV2ShipTo } from './EximbayV2ShipTo.js';
import type { EximbayV2BillTo } from './EximbayV2BillTo.js';
import type { EximbayV2Settings } from './EximbayV2Settings.js';
/**
 * 엑심베이 V2 bypass 파라미터
 */
export type EximbayV2Bypass = {
    /**
     * 결제 정보
     */
    payment?: EximbayV2Payment | undefined;
    /**
     * 상점 정보
     */
    merchant?: EximbayV2Merchant | undefined;
    /**
     * 세금 정보
     */
    tax?: EximbayV2Tax | undefined;
    /**
     * 최대 3개의 추가 비용 목록
     */
    surcharge?: EximbayV2Surcharge[] | undefined;
    /**
     * 배송지 정보
     */
    ship_to?: EximbayV2ShipTo | undefined;
    /**
     * 청구지 정보
     */
    bill_to?: EximbayV2BillTo | undefined;
    /**
     * 설정 정보
     */
    settings?: EximbayV2Settings | undefined;
};
