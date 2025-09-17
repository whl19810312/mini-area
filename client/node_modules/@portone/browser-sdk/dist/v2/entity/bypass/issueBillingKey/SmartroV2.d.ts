import { SmartroV2SkinColor } from './SmartroV2SkinColor.js';
import { SmartroV2IsPwdPass } from './SmartroV2IsPwdPass.js';
/**
 * **스마트로 bypass 파라미터**
 */
export type SmartroV2IssueBillingKeyBypass = {
    /**
     * UI 스타일(기본: RED)
     */
    SkinColor?: SmartroV2SkinColor | undefined;
    /**
     * 결제 비밀번호 등록 Skip 여부
     */
    IsPwdPass?: SmartroV2IsPwdPass | undefined;
};
