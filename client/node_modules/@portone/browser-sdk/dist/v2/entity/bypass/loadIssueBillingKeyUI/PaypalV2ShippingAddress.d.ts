import { PaypalV2Country } from './PaypalV2Country.js';
export type PaypalV2ShippingAddress = {
    /**
     * 수령인 이름
     */
    recipient_name?: string | undefined;
    /**
     * 도로명 주소
     */
    line1: string;
    /**
     * 아파트 동 호수
     */
    line2?: string | undefined;
    /**
     * 도시 이름
     */
    city: string;
    /**
     * 주 이름 (아르헨티나, 브라질, 캐나다, 중국, 인도, 이탈리아, 일본, 멕시코, 태국 또는 미국의 경우 필수)
     */
    state?: string | undefined;
    /**
     * 우편번호
     */
    postal_code?: string | undefined;
    /**
     * 국가 코드
     */
    country_code: PaypalV2Country;
};
