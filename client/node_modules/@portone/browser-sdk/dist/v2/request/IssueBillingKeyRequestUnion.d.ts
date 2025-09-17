import type { IssueBillingKeyRequestUnionCard } from './IssueBillingKeyRequestUnionCard.js';
import type { IssueBillingKeyRequestUnionMobile } from './IssueBillingKeyRequestUnionMobile.js';
import type { IssueBillingKeyRequestUnionEasyPay } from './IssueBillingKeyRequestUnionEasyPay.js';
import type { IssueBillingKeyRequestUnionPaypal } from './IssueBillingKeyRequestUnionPaypal.js';
export type IssueBillingKeyRequestUnion = {
    card?: IssueBillingKeyRequestUnionCard | undefined;
    mobile?: IssueBillingKeyRequestUnionMobile | undefined;
    easyPay?: IssueBillingKeyRequestUnionEasyPay | undefined;
    paypal?: IssueBillingKeyRequestUnionPaypal | undefined;
};
