/**
 * **배송지 정보**
 */
export type EximbayV2ShipTo = {
    /**
     * **배송지 도시**
     */
    city: string;
    /**
     * **배송지 국가 (ISO 3166 두 자리 국가 코드)**
     */
    country: string;
    /**
     * **수신인의 성을 제외한 이름**
     */
    first_name: string;
    /**
     * **수신인의 성**
     */
    last_name: string;
    /**
     * **수신인 전화번호**
     */
    phone_number: string;
    /**
     * **배송지 우편번호**
     */
    postal_code: string;
    /**
     * **배송지가 미국 혹은 캐나다인 경우, 배송지 주 정보**
     */
    state: string;
    /**
     * **배송지 상세 주소**
     */
    street1: string;
};
