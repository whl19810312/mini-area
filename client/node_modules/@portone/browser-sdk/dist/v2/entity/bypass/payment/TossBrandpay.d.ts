import type { TossBrandpayBrandpayOptions } from './TossBrandpayBrandpayOptions.js';
import type { TossBrandpayWidgetOptions } from './TossBrandpayWidgetOptions.js';
/**
 * 토스 브랜드페이 bypass 파라미터
 */
export type TossBrandpayPaymentBypass = {
    /**
     * loadBrandpay 호출시 전달하는 세번째 파라미터
     */
    brandpayOptions?: TossBrandpayBrandpayOptions | undefined;
    /**
     * 브랜드페이 위젯 render() 함수 호출시 전달하는 두번째 파라미터
     */
    widgetOptions?: TossBrandpayWidgetOptions | undefined;
    /**
     * 카드사 할인코드
     */
    discountCode?: string | undefined;
    /**
     * 등록되어 있는 결제수단 중 하나를 지정해서 바로 결제하고 싶을 때 사용
     */
    methodId?: string | undefined;
};
