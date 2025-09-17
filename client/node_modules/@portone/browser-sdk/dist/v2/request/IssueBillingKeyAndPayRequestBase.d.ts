import type { StoreId } from '../entity/StoreId.js';
import type { PaymentOrderName } from '../entity/PaymentOrderName.js';
import type { PaymentTotalAmount } from '../entity/PaymentTotalAmount.js';
import { Currency } from '../entity/Currency.js';
import type { ChannelKey } from '../entity/ChannelKey.js';
import { BillingKeyAndPayMethod } from '../entity/BillingKeyAndPayMethod.js';
import type { TaxFreeAmount } from '../entity/TaxFreeAmount.js';
import type { VatAmount } from '../entity/VatAmount.js';
import type { Customer } from '../entity/Customer.js';
import type { Product } from '../entity/Product.js';
import type { WindowTypes } from '../entity/WindowTypes.js';
import type { RedirectUrl } from '../entity/RedirectUrl.js';
import { Locale } from '../entity/Locale.js';
import type { OfferPeriod } from '../entity/OfferPeriod.js';
import { ProductType } from '../entity/ProductType.js';
import type { StoreDetails } from '../entity/StoreDetails.js';
import { Country } from '../entity/Country.js';
import type { IssueBillingKeyAndPayBypass } from '../entity/bypass/IssueBillingKeyAndPayBypass.js';
import type { Popup } from '../entity/Popup.js';
import type { Iframe } from '../entity/Iframe.js';
export type IssueBillingKeyAndPayRequestBase = {
    /**
     * **상점 아이디**
     *
     * 포트원 계정에 생성된 상점을 식별하는 고유한 값으로 [관리자 콘솔 > 연동 정보](https://admin.portone.io/integration-v2/manage/channel) 우측 상단에서 확인할 수 있습니다.
     */
    storeId: StoreId;
    /**
     * **결제 ID**
     *
     * 고객사에서 임의로 ID를 정합니다.
     *
     * 이미 결제 완료된 `paymentId`로 결제를 요청하는 경우 실패합니다.
     */
    paymentId: string;
    /**
     * **주문명**
     */
    orderName: PaymentOrderName;
    /**
     * **결제 금액**
     *
     * 결제 금액을 정수로 나타냅니다.
     *
     * 해외 통화의 경우 통화의 최소 단위(minor unit)를 기준으로 합니다. 예를 들어, USD의 최소 단위는 센트(0.01 USD)이므로, 6 USD의 경우 100배하여 600으로 입력합니다.
     *
     * 최소 단위는 [ISO 4217](https://www.iso.org/iso-4217-currency-codes.html)에 표준화된 것을 기준으로 합니다.
     *
     * - KRW: 1배
     * - USD: 100배
     * - JPY: 1배
     */
    totalAmount: PaymentTotalAmount;
    /**
     * **화폐**
     *
     * [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) 화폐 코드
     *
     * 대한민국 원, 일본 엔이 아닌 화폐를 사용할 때에는 금액을 minor unit 단위로 입력해야 함에 유의하세요.
     */
    currency: Currency;
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
     * 빌링키 발급 및 초회결제 수단
     */
    billingKeyAndPayMethod: BillingKeyAndPayMethod;
    /**
     * **면세 금액**
     *
     * 미입력 시 0으로 취급됩니다.
     */
    taxFreeAmount?: TaxFreeAmount | undefined;
    /**
     * **부가세 금액**
     *
     * 미입력 시 과세 금액의 1/11로 자동 계산됩니다.
     */
    vatAmount?: VatAmount | undefined;
    customer?: Customer | undefined;
    /**
     * **구매 상품 정보**
     */
    products?: Product[] | undefined;
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
     * **웹훅 URL**
     *
     * 웹훅을 받을 URL 목록입니다. 값이 있으면 관리자 콘솔에 설정한 URL로는 웹훅이 발송되지 않습니다.
     */
    noticeUrls?: string[] | undefined;
    /**
     * **UI 언어**
     *
     * KG이니시스, 스마트로, KSNET, 웰컴페이먼츠 (PC), 한국결제네트웍스, 엑심베이에서 설정 가능하며, PG마다 지원하는 언어 목록은 차이가 있습니다.
     */
    locale?: Locale | undefined;
    /**
     * **문화비 지출 여부**
     *
     * 도서, 공연, 박물관 등 문화비 지출 여부
     */
    isCulturalExpense?: boolean | undefined;
    /**
     * **결제 정보와 함께 관리하고 싶은 고객사 커스텀 JSON 데이터**
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
     * **앱 URL 스킴**
     */
    appScheme?: string | undefined;
    /**
     * **상품 유형**
     *
     * 휴대폰 빌링키 발급시 필수 입력입니다.
     */
    productType?: ProductType | undefined;
    /**
     * **상점 정보**
     *
     * - KSNET 카카오페이의 경우 필수 입력
     * - 나이스페이먼츠의 경우 매출 전표에 표기 할 용도로 선택 입력
     * - KG이니시스 일본결제의 경우 JPPG(gmoPayment) 결제의 상점정보로 사용되거나 편의점 결제 시 영수증 표시 정보로 사용됨.
     */
    storeDetails?: StoreDetails | undefined;
    /**
     * **국가**
     *
     * [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) 코드입니다.
     */
    country?: Country | undefined;
    bypass?: IssueBillingKeyAndPayBypass | undefined;
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
