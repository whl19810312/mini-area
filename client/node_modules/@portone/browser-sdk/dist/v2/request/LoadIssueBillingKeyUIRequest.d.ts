import { IssueBillingKeyUIType } from '../entity/IssueBillingKeyUIType.js';
import { Currency } from '../entity/Currency.js';
import type { StoreId } from '../entity/StoreId.js';
import type { ChannelKey } from '../entity/ChannelKey.js';
import { BillingKeyMethod } from '../entity/BillingKeyMethod.js';
import type { Customer } from '../entity/Customer.js';
import type { RedirectUrl } from '../entity/RedirectUrl.js';
import { Locale } from '../entity/Locale.js';
import { ProductType } from '../entity/ProductType.js';
import type { LoadIssueBillingKeyUIBypass } from '../entity/bypass/LoadIssueBillingKeyUIBypass.js';
export type LoadIssueBillingKeyUIRequest = {
    uiType: IssueBillingKeyUIType;
    /**
     * 빌링 등록 UI에 표시되는 금액
     */
    displayAmount?: number | undefined;
    /**
     * `displayAmount`의 화폐
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
    channelKey: ChannelKey;
    /**
     * **결제 수단 정보**
     */
    billingKeyMethod: BillingKeyMethod;
    /**
     * **주문명**
     */
    issueName?: string | undefined;
    /**
     * **빌링 등록 주문 번호**
     */
    issueId?: string | undefined;
    /**
     * **구매자 정보**
     */
    customer?: Customer | undefined;
    /**
     * **리디렉션 방식에서 결제 완료 후 이동할 URL**
     *
     * 결제사 페이지로 이동하여 진행하는 리디렉션 방식의 경우 필수로 설정해야 합니다. 대부분의 모바일 환경이 리디렉션 방식에 해당됩니다.
     */
    redirectUrl?: RedirectUrl | undefined;
    /**
     * **UI 언어**
     */
    locale?: Locale | undefined;
    /**
     * **빌링키 커스텀 JSON 데이터**
     *
     * 자유롭게 데이터를 넣어 이후 조회할 수 있습니다.
     */
    customData?: Record<string, any> | undefined;
    /**
     * **앱 URL 스킴**
     */
    appScheme?: string | undefined;
    /**
     * **웹훅 URL**
     */
    noticeUrls?: string[] | undefined;
    /**
     * **상품 유형**
     *
     * 휴대폰 빌링키 발급시 필수 입력입니다.
     */
    productType?: ProductType | undefined;
    bypass?: LoadIssueBillingKeyUIBypass | undefined;
};
