import { InicisV2CardUse } from './InicisV2CardUse.js';
/**
 * **KG이니시스 bypass 파라미터**
 */
export type InicisV2IssueBillingKeyBypass = {
    /**
     * 개인/법인카드 선택 옵션
     */
    carduse?: InicisV2CardUse | undefined;
};
