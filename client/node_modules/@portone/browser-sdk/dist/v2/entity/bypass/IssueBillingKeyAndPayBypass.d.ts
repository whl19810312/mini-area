import type { WelcomeIssueBillingKeyAndPayBypass } from './issueBillingKeyAndPay/Welcome.js';
import type { PayletterGlobalIssueBillingKeyAndPayBypass } from './issueBillingKeyAndPay/PayletterGlobal.js';
import type { EximbayV2IssueBillingKeyAndPayBypass } from './issueBillingKeyAndPay/EximbayV2.js';
export type IssueBillingKeyAndPayBypass = {
    /**
     * **웰컴페이먼츠 bypass 파라미터**
     */
    welcome?: WelcomeIssueBillingKeyAndPayBypass | undefined;
    /**
     * **페이레터 해외결제 bypass 파라미터**
     */
    payletter_global?: PayletterGlobalIssueBillingKeyAndPayBypass | undefined;
    /**
     * **엑심베이 bypass 파라미터**
     */
    eximbay_v2?: EximbayV2IssueBillingKeyAndPayBypass | undefined;
};
