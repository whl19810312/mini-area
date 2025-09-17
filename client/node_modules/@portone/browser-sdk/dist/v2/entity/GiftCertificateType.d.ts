/**
 * **상품권 종류**
 */
export declare const GiftCertificateType: {
    /**
     * 도서문화상품권
     * | KG이니시스
     */
    readonly BOOKNLIFE: "BOOKNLIFE";
    /**
     * 스마트문상, (구)게임문화상품권
     */
    readonly SMART_MUNSANG: "SMART_MUNSANG";
    /**
     * 컬쳐랜드 문화상품권
     */
    readonly CULTURELAND: "CULTURELAND";
    /**
     * 문화상품권
     */
    readonly CULTURE_GIFT: "CULTURE_GIFT";
};
/**
 * **상품권 종류**
 */
export type GiftCertificateType = (typeof GiftCertificateType)[keyof typeof GiftCertificateType] | `GIFT_CERTIFICATE_TYPE_${(typeof GiftCertificateType)[keyof typeof GiftCertificateType]}`;
