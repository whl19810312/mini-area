import { PaypalV2StyleColor } from './PaypalV2StyleColor.js';
import { PaypalV2StyleLabel } from './PaypalV2StyleLabel.js';
import { PaypalV2StyleLayout } from './PaypalV2StyleLayout.js';
import { PaypalV2StyleShape } from './PaypalV2StyleShape.js';
/**
 * SPB 버튼 렌더링에 필요한 파라미터
 */
export type PaypalV2Style = {
    /**
     * 버튼 색상
     */
    color?: PaypalV2StyleColor | undefined;
    /**
     * 버튼 높이
     */
    height?: number | undefined;
    /**
     * 버튼 라벨
     */
    label?: PaypalV2StyleLabel | undefined;
    /**
     * 버튼 렌더링 방향
     */
    layout?: PaypalV2StyleLayout | undefined;
    /**
     * 버튼 모양
     */
    shape?: PaypalV2StyleShape | undefined;
    /**
     * label이 installment일 때 할부 결제 되는 월
     */
    period?: string | undefined;
    /**
     * 버튼 하위에 문구 노출 여부
     */
    tagline?: boolean | undefined;
};
