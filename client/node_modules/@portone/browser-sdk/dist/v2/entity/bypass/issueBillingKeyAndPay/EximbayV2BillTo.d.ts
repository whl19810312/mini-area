/**
 * **청구지 정보**
 */
export type EximbayV2BillTo = {
    /**
     * **청구지 도시**
     */
    city: string;
    /**
     * **청구지 국가 (ISO 3166 두 자리 국가 코드)**
     */
    country: string;
    /**
     * **청구 카드 명의자의 성을 제외한 이름**
     */
    first_name: string;
    /**
     * **청구 카드 명의자의 성**
     */
    last_name: string;
    /**
     * **청구 카드 명의자의 전화번호**
     */
    phone_number: string;
    /**
     * **청구지 우편번호**
     */
    postal_code: string;
    /**
     * **청구지가 미국 혹은 캐나다인 경우, 청구지 주 정보**
     */
    state: string;
    /**
     * **청구지 상세 주소**
     */
    street1: string;
};
