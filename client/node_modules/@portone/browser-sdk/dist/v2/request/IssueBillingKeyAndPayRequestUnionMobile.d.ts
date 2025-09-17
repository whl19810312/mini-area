import { Carrier } from '../entity/Carrier.js';
export type IssueBillingKeyAndPayRequestUnionMobile = {
    /**
     * 통신사 코드
     */
    carrier?: Carrier | undefined;
    /**
     * 통신사 코드
     */
    avaliableCarriers?: Carrier[] | undefined;
};
