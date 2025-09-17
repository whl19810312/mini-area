import type { PaymentRequestUnionCard } from './PaymentRequestUnionCard.js';
import type { PaymentRequestUnionVirtualAccount } from './PaymentRequestUnionVirtualAccount.js';
import type { PaymentRequestUnionTransfer } from './PaymentRequestUnionTransfer.js';
import type { PaymentRequestUnionMobile } from './PaymentRequestUnionMobile.js';
import type { PaymentRequestUnionGiftCertificate } from './PaymentRequestUnionGiftCertificate.js';
import type { PaymentRequestUnionEasyPay } from './PaymentRequestUnionEasyPay.js';
import type { PaymentRequestUnionPaypal } from './PaymentRequestUnionPaypal.js';
import type { PaymentRequestUnionAlipay } from './PaymentRequestUnionAlipay.js';
import type { PaymentRequestUnionConvenienceStore } from './PaymentRequestUnionConvenienceStore.js';
export type PaymentRequestUnion = {
    /**
     * **카드 결제 설정**
     */
    card?: PaymentRequestUnionCard | undefined;
    /**
     * **가상계좌 결제 설정**
     */
    virtualAccount?: PaymentRequestUnionVirtualAccount | undefined;
    /**
     * **계좌이체 결제 설정**
     */
    transfer?: PaymentRequestUnionTransfer | undefined;
    /**
     * **휴대전화 결제 설정**
     */
    mobile?: PaymentRequestUnionMobile | undefined;
    /**
     * **상품권 결제 설정**
     */
    giftCertificate?: PaymentRequestUnionGiftCertificate | undefined;
    easyPay?: PaymentRequestUnionEasyPay | undefined;
    paypal?: PaymentRequestUnionPaypal | undefined;
    alipay?: PaymentRequestUnionAlipay | undefined;
    convenienceStore?: PaymentRequestUnionConvenienceStore | undefined;
};
