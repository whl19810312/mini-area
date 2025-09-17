/**
 * 하부 가맹점 정보. PG 업종 가맹점인 경우에만 필수 값
 */
export type NaverpaySubMerchantInfo = {
    /**
     * 하부 가맹점 명
     */
    subMerchantName: string;
    /**
     * 하부 가맹점 ID
     */
    subMerchantId: string;
    /**
     * 하부 가맹점 사업자 번호(숫자 10자리)
     */
    subMerchantBusinessNo: string;
    /**
     * 하부 가맹점 결제 키
     */
    subMerchantPayId: string;
    /**
     * 하부 가맹점 대표 전화번호
     */
    subMerchantTelephoneNo: string;
    /**
     * 하부 가맹점 고객 서비스 URL
     */
    subMerchantCustomerServiceUrl: string;
};
