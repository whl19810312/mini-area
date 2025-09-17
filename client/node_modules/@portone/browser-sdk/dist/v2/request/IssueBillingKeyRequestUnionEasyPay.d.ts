import { CardCompany } from '../entity/CardCompany.js';
import { EasyPayProvider } from '../entity/EasyPayProvider.js';
import { EasyPayPaymentMethod } from '../entity/EasyPayPaymentMethod.js';
export type IssueBillingKeyRequestUnionEasyPay = {
    /**
     * 카드 결제시 사용되는 카드사 코드
     */
    availableCards?: CardCompany[] | undefined;
    /**
     * PG 제휴로 간편결제를 이용할 때, 간편결제 UI를 직접 호출할 수 있는 간편결제
     */
    easyPayProvider?: EasyPayProvider | undefined;
    /**
     * 노출을 허용할 결제 수단의 종류
     */
    availablePayMethods?: EasyPayPaymentMethod[] | undefined;
};
