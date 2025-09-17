import { CardCompany } from '../entity/CardCompany.js';
export type IssueBillingKeyRequestUnionCard = {
    /**
     * 카드 결제시 사용되는 카드사 코드
     */
    cardCompany?: CardCompany | undefined;
};
