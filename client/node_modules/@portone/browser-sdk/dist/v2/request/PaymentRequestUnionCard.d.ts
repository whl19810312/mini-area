import { CardCompany } from '../entity/CardCompany.js';
import type { Installment } from '../entity/Installment.js';
/**
 * **카드 결제 설정**
 */
export type PaymentRequestUnionCard = {
    /**
     * **카드사 다이렉트 호출 시 필요한 카드사 식별 값**
     */
    cardCompany?: CardCompany | undefined;
    /**
     * **일부 카드사만 노출 설정**
     *
     * 일부 카드사만을 선택 가능하게 하고 싶은 경우 사용하는 옵션입니다.
     */
    availableCards?: CardCompany[] | undefined;
    /**
     * **상점분담 무이자 활성화 여부**
     */
    useFreeInterestFromMall?: boolean | undefined;
    /**
     * **할부 설정**
     *
     * 신용카드 결제 시 할부 관련 설정을 제어합니다.
     *
     * ## 사용 예시
     *
     * ### 3개월 고정 할부
     *
     * ```typescript
     * installment: {
     *   monthOption: {
     *     fixedMonth: 3
     *   }
     * }
     * ```
     *
     * ### 2~6개월 할부 선택
     *
     * ```typescript
     * installment: {
     *   monthOption: {
     *     availableMonthList: [2, 3, 4, 5, 6]
     *   }
     * }
     * ```
     *
     * ### 무이자 할부 설정 (삼성카드 2,3개월)
     *
     * ```typescript
     * installment: {
     *   freeInstallmentPlans: [{
     *     cardCompany: 'CARD_COMPANY_SAMSUNG',
     *     months: [2, 3]
     *   }]
     * }
     * ```
     *
     * ## 주의사항
     *
     * - 일반적으로 5만원 이상부터 할부가 가능합니다
     * - 1개월 할부는 일시불과 동일하게 처리됩니다
     * - 카드 다이렉트 호출 시 고정 할부만 가능한 PG사가 있습니다
     * - 무이자 할부는 가맹점이 수수료를 부담하는 방식입니다
     */
    installment?: Installment | undefined;
    /**
     * **카드 포인트 사용 설정**
     */
    useCardPoint?: boolean | undefined;
    /**
     * **앱 카드만 허용할지 여부**
     */
    useAppCardOnly?: boolean | undefined;
    /**
     * 할부 사용 가능 여부
     */
    useInstallment?: boolean | undefined;
};
