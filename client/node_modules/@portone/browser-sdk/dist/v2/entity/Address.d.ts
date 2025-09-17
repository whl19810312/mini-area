import { Country } from './Country.js';
/**
 * **주소 정보**
 */
export type Address = {
    /**
     * **국가**
     *
     * [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) 코드입니다.
     */
    country?: Country | undefined;
    /**
     * **주소 첫째 줄**
     */
    addressLine1: string;
    /**
     * **주소 둘째 줄**
     */
    addressLine2: string;
    /**
     * **도시**
     */
    city?: string | undefined;
    /**
     * **주, 도, 시**
     */
    province?: string | undefined;
};
