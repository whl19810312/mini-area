import { Country } from '../../Country.js';
export type PaypalV2PayerAddress = {
    /**
     * 구매자 주소지 정보
     */
    address_line_1?: string | undefined;
    address_line_2?: string | undefined;
    admin_area_1?: string | undefined;
    admin_area_2?: string | undefined;
    /**
     * 우편번호
     */
    postal_code?: string | undefined;
    /**
     * 국가 코드
     */
    country_code: Country;
};
