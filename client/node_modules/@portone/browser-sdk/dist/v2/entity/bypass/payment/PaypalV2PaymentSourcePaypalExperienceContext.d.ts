import { PaypalV2PaymentSourcePaypalExperienceContextShippingPreference } from './PaypalV2PaymentSourcePaypalExperienceContextShippingPreference.js';
import { PaypalV2PaymentSourcePaypalExperienceContextLandingPage } from './PaypalV2PaymentSourcePaypalExperienceContextLandingPage.js';
import { PaypalV2PaymentSourcePaypalExperienceContextPaymentMethodPreference } from './PaypalV2PaymentSourcePaypalExperienceContextPaymentMethodPreference.js';
export type PaypalV2PaymentSourcePaypalExperienceContext = {
    brand_name?: string | undefined;
    shipping_preference?: PaypalV2PaymentSourcePaypalExperienceContextShippingPreference | undefined;
    landing_page?: PaypalV2PaymentSourcePaypalExperienceContextLandingPage | undefined;
    payment_method_preference?: PaypalV2PaymentSourcePaypalExperienceContextPaymentMethodPreference | undefined;
};
