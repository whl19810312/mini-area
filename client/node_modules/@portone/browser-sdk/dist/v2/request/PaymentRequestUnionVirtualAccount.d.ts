import { CashReceiptType } from '../entity/CashReceiptType.js';
import type { PaymentRequestUnionVirtualAccountFixedOption } from './PaymentRequestUnionVirtualAccountFixedOption.js';
import { Bank } from '../entity/Bank.js';
import type { PaymentRequestUnionVirtualAccountAccountExpiry } from './PaymentRequestUnionVirtualAccountAccountExpiry.js';
/**
 * **가상계좌 결제 설정**
 */
export type PaymentRequestUnionVirtualAccount = {
    /**
     * **현금영수증 유형**
     *
     * 토스페이먼츠, KG이니시스, 스마트로, 웰컴페이먼츠, 한국결제네트웍스에서 지원합니다. 동작은 PG에 따라 다릅니다.
     */
    cashReceiptType?: CashReceiptType | undefined;
    /**
     * **현금영수증 구매자 번호**
     *
     * 카드일련번호, 주민등록번호, 사업자등록번호, 휴대전화번호 중 하나입니다. 스마트로에서 PG UI를 건너뛸 때 사용합니다.
     */
    customerIdentifier?: string | undefined;
    /**
     * **고정식 가상계좌 설정**
     */
    fixedOption?: PaymentRequestUnionVirtualAccountFixedOption | undefined;
    /**
     * **은행**
     *
     * 가상계좌를 발급할 은행입니다. KCP와 스마트로에서 지원합니다.
     */
    bankCode?: Bank | undefined;
    /**
     * **가상계좌 입금 만료 기한**
     *
     * 토스페이먼츠, KG이니시스, NHN KCP에서 지원합니다.
     *
     * `validHours`와 `dueDate` 중 하나만 지정합니다.
     */
    accountExpiry?: PaymentRequestUnionVirtualAccountAccountExpiry | undefined;
    /**
     * **선택 가능 은행 목록**
     *
     * 가상계좌 발급 UI에서 선택할 수 있는 은행 목록을 지정합니다. KCP에서만 지원합니다.
     */
    availableBanks?: Bank[] | undefined;
};
