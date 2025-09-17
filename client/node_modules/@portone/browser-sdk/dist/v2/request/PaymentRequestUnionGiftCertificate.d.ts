import { GiftCertificateType } from '../entity/GiftCertificateType.js';
/**
 * **상품권 결제 설정**
 */
export type PaymentRequestUnionGiftCertificate = {
    /**
     * **상품권 종류**
     */
    giftCertificateType?: GiftCertificateType | undefined;
};
