import { NaverpayProductItemPayReferrer } from './NaverpayProductItemPayReferrer.js';
export type NaverpayProductItem = {
    /**
     * 결제 상품 유형
     */
    categoryType: string;
    /**
     * 결제 상품 분류
     */
    categoryId: string;
    /**
     * 결제 상품 식별값
     */
    uid: string;
    /**
     * 상품명
     */
    name: string;
    /**
     * 결제 상품 유입경로
     */
    payReferrer?: NaverpayProductItemPayReferrer | undefined;
    /**
     * 시작일(YYYYMMDD)
     */
    startDate?: string | undefined;
    /**
     * 종료일(YYYYMMDD)
     */
    endDate?: string | undefined;
    /**
     * 하위 판매자 식별키
     */
    sellerId?: string | undefined;
    /**
     * 결제 상품 개수
     */
    count: number;
};
