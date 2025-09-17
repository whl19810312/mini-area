import { TossBrandpayWidgetOptionsMethodType } from './TossBrandpayWidgetOptionsMethodType.js';
import type { TossBrandpayWidgetOptionsUi } from './TossBrandpayWidgetOptionsUi.js';
/**
 * 브랜드페이 위젯 render() 함수 호출시 전달하는 두번째 파라미터
 */
export type TossBrandpayWidgetOptions = {
    /**
     * 위젯에 보여줄 결제 수단. 예) 카드 전달시 등록한 결제 수단 중 카드만 노출 됨
     */
    methodType?: TossBrandpayWidgetOptionsMethodType | undefined;
    /**
     * 위젯에서 기본 결제 수단으로 선택할 결제 수단의 ID
     */
    methodId?: string | undefined;
    ui?: TossBrandpayWidgetOptionsUi | undefined;
};
