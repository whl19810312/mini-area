import type { NaverpayProductItem } from './NaverpayProductItem.js';
import type { NaverpaySubMerchantInfo } from './NaverpaySubMerchantInfo.js';
/**
 * 네이버페이 bypass 파라미터
 */
export type NaverpayPaymentBypass = {
    /**
     * 이용 완료일(YYYYMMDD)
     */
    useCfmYmdt?: string | undefined;
    productItems: NaverpayProductItem[];
    /**
     * 하부 가맹점 정보. PG 업종 가맹점인 경우에만 필수 값
     */
    subMerchantInfo?: NaverpaySubMerchantInfo | undefined;
    /**
     * 배송비
     */
    deliveryFee?: number | undefined;
};
