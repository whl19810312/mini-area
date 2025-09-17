import { Currency } from '../entity/Currency.js';
import type { StoreId } from '../entity/StoreId.js';
import type { ChannelKey } from '../entity/ChannelKey.js';
import { BillingKeyMethod } from '../entity/BillingKeyMethod.js';
import type { Customer } from '../entity/Customer.js';
import type { WindowTypes } from '../entity/WindowTypes.js';
import type { RedirectUrl } from '../entity/RedirectUrl.js';
import { Locale } from '../entity/Locale.js';
import type { OfferPeriod } from '../entity/OfferPeriod.js';
import { ProductType } from '../entity/ProductType.js';
import type { IssueBillingKeyBypass } from '../entity/bypass/IssueBillingKeyBypass.js';
import type { Popup } from '../entity/Popup.js';
import type { Iframe } from '../entity/Iframe.js';
export type IssueBillingKeyRequestBase = {
    /**
     * 빌링키 발급 창에 디스플레이 용으로 띄우는 금액
     */
    displayAmount?: number | undefined;
    /**
     * displayAmount 의 화폐
     */
    currency?: Currency | undefined;
    /**
     * **상점 아이디**
     *
     * 포트원 계정에 생성된 상점을 식별하는 고유한 값으로 [관리자 콘솔 > 연동 정보](https://admin.portone.io/integration-v2/manage/channel) 우측 상단에서 확인할 수 있습니다.
     */
    storeId: StoreId;
    /**
     * **채널 키**
     *
     * 포트원에 등록된 결제 채널 중 하나를 지정합니다.
     *
     * [관리자 콘솔 > 연동 정보](https://admin.portone.io/integration-v2/manage/channel)에서 채널 연동 후 채널 키를 확인할 수 있습니다.
     *
     * 채널 키와 채널 그룹 ID 중 하나를 지정해야 합니다.
     */
    channelKey?: ChannelKey | undefined;
    /**
     * 빌링키 발급 수단
     */
    billingKeyMethod: BillingKeyMethod;
    /**
     * 빌링키 발급 주문 명
     */
    issueName?: string | undefined;
    /**
     * 빌링키 발급 주문 고유 번호
     */
    issueId?: string | undefined;
    customer?: Customer | undefined;
    /**
     * **환경 별 제공되는 결제/본인인증 창 유형**
     *
     * - PG사에 따라 가능한 창 유형이 다릅니다.
     * - 전달되지 않았을 때 결정되는 기본 창이 다릅니다.
     * - 미입력 시, 해당 PG사의 기본 창 방식을 따릅니다.
     */
    windowType?: WindowTypes | undefined;
    /**
     * **리디렉션 방식에서 결제 완료 후 이동할 URL**
     *
     * 결제사 페이지로 이동하여 진행하는 리디렉션 방식의 경우 필수로 설정해야 합니다. 대부분의 모바일 환경이 리디렉션 방식에 해당됩니다.
     */
    redirectUrl?: RedirectUrl | undefined;
    /**
     * **UI 언어**
     *
     * KG이니시스, 스마트로, KSNET, 웰컴페이먼츠 (PC), 한국결제네트웍스, 엑심베이에서 설정 가능하며, PG마다 지원하는 언어 목록은 차이가 있습니다.
     */
    locale?: Locale | undefined;
    /**
     * **빌링키 발급 정보와 함께 관리하고 싶은 고객사 커스텀 JSON 데이터**
     */
    customData?: Record<string, any> | undefined;
    /**
     * **서비스 제공 기간**
     *
     * range와 interval 중 하나를 입력해주세요.
     *
     * - range: 제공 기간 범위
     * - interval: 제공 기간 주기
     *
     * 예1) 2023년 1월 1일 00시 00분 00초(KST) ~
     *
     * ```js
     * range: {
     *  from: '2023-01-01T00:00:00+09:00'
     * }
     * ```
     *
     * 예2) ~ 2023년 1월 1일 00시 00분 00초(KST)
     *
     * ```js
     * range: {
     *  to: '2023-01-01T00:00:00+09:00'
     * }
     * ```
     *
     * 예3) 2023년 1월 1일 00시 00분 00초(KST) ~ 2023년 12월 31일 23시 59분 59초(KST)
     *
     * ```js
     * range: {
     *  from: '2023-12-31T23:59:59+09:00'
     *  to: '2023-01-01T00:00:00+09:00'
     * }
     * ```
     *
     * 예4) 30일 주기
     * `interval: '30d'`
     *
     * 예5) 6개월 주기
     * `interval: '6m'`
     *
     * 예6) 1년 주기
     * `interval: '1y'`
     */
    offerPeriod?: OfferPeriod | undefined;
    /**
     * 앱 URL Scheme
     */
    appScheme?: string | undefined;
    /**
     * 웹훅 URL
     */
    noticeUrls?: string[] | undefined;
    /**
     * **상품 유형**
     */
    productType?: ProductType | undefined;
    bypass?: IssueBillingKeyBypass | undefined;
    /**
     * **팝업 관련 필드**
     *
     * UI가 팝업 창으로 열릴 때 적용되는 속성입니다.
     */
    popup?: Popup | undefined;
    /**
     * **결제창이 iframe 방식일 경우 결제창에 적용할 속성**
     */
    iframe?: Iframe | undefined;
};
