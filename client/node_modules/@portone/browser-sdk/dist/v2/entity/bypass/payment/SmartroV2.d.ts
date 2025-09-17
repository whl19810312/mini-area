import { SmartroV2SkinColor } from './SmartroV2SkinColor.js';
import { SmartroV2OpenType } from './SmartroV2OpenType.js';
/**
 * 스마트로 V2 bypass 파라미터
 */
export type SmartroV2PaymentBypass = {
    /**
     * 결제 상품 품목 개수
     */
    GoodsCnt?: number | undefined;
    /**
     * UI 스타일 (기본값: `"RED"`)
     *
     * `"RED"`, `"GREEN"`, `"BLUE"`, `"PURPLE"` 중 하나의 값으로 입력해주세요.
     */
    SkinColor?: SmartroV2SkinColor | undefined;
    /**
     * 해외 카드만 결제를 허용할지 여부(기본값: `"KR"`)
     *
     * `"KR"`, `"EN"` 중 하나의 값으로 입력해주세요.
     */
    OpenType?: SmartroV2OpenType | undefined;
};
