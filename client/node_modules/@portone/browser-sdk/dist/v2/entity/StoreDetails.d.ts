import type { StoreDetailsOpeningHours } from './StoreDetailsOpeningHours.js';
/**
 * **상점 정보**
 *
 * - KSNET 카카오페이의 경우 필수 입력
 * - 나이스페이먼츠의 경우 매출 전표에 표기 할 용도로 선택 입력
 * - KG이니시스 일본결제의 경우 JPPG(gmoPayment) 결제의 상점정보로 사용되거나 편의점 결제 시 영수증 표시 정보로 사용됨.
 */
export type StoreDetails = {
    /**
     * **대표자 이름**
     */
    ceoFullName?: string | undefined;
    /**
     * **전화번호**
     */
    phoneNumber?: string | undefined;
    /**
     * **주소**
     */
    address?: string | undefined;
    /**
     * 우편번호
     */
    zipcode?: string | undefined;
    /**
     * 이메일
     */
    email?: string | undefined;
    /**
     * **사업자명 (상호)**
     */
    businessName?: string | undefined;
    /**
     * **사업자 등록 번호**
     */
    businessRegistrationNumber?: string | undefined;
    /**
     * **상점명**
     */
    storeName?: string | undefined;
    /**
     * 상점명 약어
     */
    storeNameShort?: string | undefined;
    /**
     * 상점명 영문
     */
    storeNameEn?: string | undefined;
    /**
     * 상점명 후리카나 (일본어 읽는법 표기)
     */
    storeNameKana?: string | undefined;
    /**
     * 상점 영업시간 (HH:mm)
     */
    openingHours?: StoreDetailsOpeningHours | undefined;
    /**
     * **상점 연락처 정보 이름**
     *
     * ex: 문의창구, 연락처, 지원창구
     */
    contactName?: string | undefined;
};
