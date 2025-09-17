import { Carrier } from '../entity/Carrier.js';
/**
 * **휴대전화 결제 설정**
 */
export type PaymentRequestUnionMobile = {
    /**
     * **휴대폰 소액결제 통신사 바로 호출을 위한 통신사 구분 값**
     */
    carrier?: Carrier | undefined;
    /**
     * **일부 통신사만 노출 설정**
     *
     * 일부 통신사만을 선택 가능하게 하고 싶은 경우 사용하는 옵션입니다.
     */
    avaliableCarriers?: Carrier[] | undefined;
};
