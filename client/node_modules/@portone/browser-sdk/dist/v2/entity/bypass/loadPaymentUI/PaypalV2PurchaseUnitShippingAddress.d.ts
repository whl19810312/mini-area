import { Country } from '../../Country.js';
/**
 * 수령지 정보
 */
export type PaypalV2PurchaseUnitShippingAddress = {
    /**
     * 수령지 주소. 미 입력 시 입력된 주소로 override되지 않음
     */
    address_line_1: string;
    address_line_2?: string | undefined;
    admin_area_1?: string | undefined;
    /**
     * 필수 입력. 미 입력 시 create order 실패
     */
    admin_area_2: string;
    postal_code?: string | undefined;
    /**
     * 국가 코드
     */
    country_code: Country;
};
