import { TossBrandpayBrandpayOptionsUiButtonStyle } from './TossBrandpayBrandpayOptionsUiButtonStyle.js';
import type { TossBrandpayBrandpayOptionsUiLabels } from './TossBrandpayBrandpayOptionsUiLabels.js';
import type { TossBrandpayBrandpayOptionsUiNavigationBar } from './TossBrandpayBrandpayOptionsUiNavigationBar.js';
export type TossBrandpayBrandpayOptionsUi = {
    /**
     * UI의 메인 색상. (기본값: #3182f6)
     */
    highlightColor?: string | undefined;
    /**
     * 버튼 스타일
     *
     * - default(기본값): 모서리가 둥글고 주변에 여백을 가진 버튼
     * - full: 하단 영역이 전부 채워지는 형태의 버튼
     */
    buttonStyle?: TossBrandpayBrandpayOptionsUiButtonStyle | undefined;
    labels?: TossBrandpayBrandpayOptionsUiLabels | undefined;
    navigationBar?: TossBrandpayBrandpayOptionsUiNavigationBar | undefined;
};
