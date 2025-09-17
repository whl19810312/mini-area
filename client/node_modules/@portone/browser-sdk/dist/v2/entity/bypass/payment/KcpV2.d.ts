import { KcpV2ComplexPnt } from './KcpV2ComplexPnt.js';
import { KcpV2DispTax } from './KcpV2DispTax.js';
/**
 * NHN KCP bypass 파라미터
 */
export type KcpV2Bypass = {
    skin_indx?: string | undefined;
    site_logo?: string | undefined;
    shop_user_id: string;
    kcp_pay_title?: string | undefined;
    /**
     * 포인트 결제의 경우 신용카드 + 포인트 결제인데, N으로 설정 시 포인트로만 결제가 이루어짐
     */
    complex_pnt_yn?: KcpV2ComplexPnt | undefined;
    pt_memcorp_cd?: string | undefined;
    /**
     * 가상계좌, 계좌이체 시 현금영수증 노출 여부
     */
    disp_tax_yn?: KcpV2DispTax | undefined;
    /**
     * 결제창에 노출될 고객사 상호명
     */
    site_name?: string | undefined;
    /**
     * 에스크로 배송 예상 소요일
     */
    deli_term?: string | undefined;
};
