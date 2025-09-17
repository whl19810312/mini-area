import { KsnetSndQpayType } from './KsnetSndQpayType.js';
/**
 * KSNET bypass 파라미터
 */
export type KsnetPaymentBypass = {
    /**
     * 간편 결제 표시 구분
     */
    sndQpayType?: KsnetSndQpayType | undefined;
    /**
     * **KSNET 간편결제 다이렉트 여부**
     */
    easyPayDirect?: boolean | undefined;
};
