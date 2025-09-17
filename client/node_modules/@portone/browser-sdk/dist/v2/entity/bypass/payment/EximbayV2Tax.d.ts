import { EximbayV2TaxReceiptStatus } from './EximbayV2TaxReceiptStatus.js';
/**
 * 세금 정보
 */
export type EximbayV2Tax = {
    /**
     * 현금영수증 발급 여부
     */
    receipt_status?: EximbayV2TaxReceiptStatus | undefined;
};
