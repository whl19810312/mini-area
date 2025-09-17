import { CashReceiptType } from '../entity/CashReceiptType.js';
import { Bank } from '../entity/Bank.js';
/**
 * **계좌이체 결제 설정**
 */
export type PaymentRequestUnionTransfer = {
    /**
     * **현금영수증 유형**
     *
     * 토스페이먼츠, NICE페이먼츠, KG이니시스, 스마트로, KSNET, 웰컴페이먼츠, 한국결제네트웍스에서 지원합니다. 동작은 PG에 따라 다릅니다.
     */
    cashReceiptType?: CashReceiptType | undefined;
    /**
     * **현금영수증 구매자 번호**
     *
     * 카드일련번호, 주민등록번호, 사업자등록번호, 휴대전화번호 중 하나입니다. NICE페이먼츠와 스마트로에서 PG UI를 건너뛸 때 사용합니다.
     */
    customerIdentifier?: string | undefined;
    /**
     * 가상계좌 발급시 사용되는 은행 코드
     */
    bankCode?: Bank | undefined;
};
