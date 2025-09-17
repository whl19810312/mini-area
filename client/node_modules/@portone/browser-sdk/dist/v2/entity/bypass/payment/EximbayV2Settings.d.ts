import { EximbayV2SettingsCallFromApp } from './EximbayV2SettingsCallFromApp.js';
/**
 * 설정 정보
 */
export type EximbayV2Settings = {
    /**
     * 인앱 웹뷰 여부
     */
    call_from_app?: EximbayV2SettingsCallFromApp | undefined;
    /**
     * 해외 결제 가맹점에서 국내 결제를 사용할 경우 `KR`
     */
    issuer_country?: string | undefined;
    /**
     * 입금 만료 일자 (yyyyMMddHH)
     */
    virtualaccount_expiry_date?: string | undefined;
};
