/**
 * **상품 유형**
 */
export declare const ProductType: {
    /**
     * 실물
     */
    readonly REAL: "REAL";
    /**
     * 디지털
     */
    readonly DIGITAL: "DIGITAL";
};
/**
 * **상품 유형**
 */
export type ProductType = (typeof ProductType)[keyof typeof ProductType] | `PRODUCT_TYPE_${(typeof ProductType)[keyof typeof ProductType]}`;
