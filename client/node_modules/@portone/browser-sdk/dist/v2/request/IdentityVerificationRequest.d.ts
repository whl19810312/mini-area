import type { StoreId } from '../entity/StoreId.js';
import type { ChannelKey } from '../entity/ChannelKey.js';
import type { Customer } from '../entity/Customer.js';
import type { WindowTypes } from '../entity/WindowTypes.js';
import type { RedirectUrl } from '../entity/RedirectUrl.js';
import type { IdentityVerificationBypass } from '../entity/bypass/IdentityVerificationBypass.js';
import type { Popup } from '../entity/Popup.js';
import type { Iframe } from '../entity/Iframe.js';
export type IdentityVerificationRequest = {
    /**
     * **상점 아이디**
     *
     * 포트원 계정에 생성된 상점을 식별하는 고유한 값으로 [관리자 콘솔 > 연동 정보](https://admin.portone.io/integration-v2/manage/channel) 우측 상단에서 확인할 수 있습니다.
     */
    storeId: StoreId;
    /**
     * **본인인증 건 ID**
     *
     * - 임의로 ID를 정하여 입력합니다.
     * - 이미 본인인증이 완료된 `identityVerificationId`로 다시 본인인증을 시도하는 경우 실패합니다.
     */
    identityVerificationId: string;
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
     * **본인인증 정보와 함께 관리하고 싶은 고객사 커스텀 JSON 데이터**
     */
    customData?: string | undefined;
    /**
     * **PG사 본인인증 창 호출 시 PG사로 그대로 bypass할 값들의 모음**
     */
    bypass?: IdentityVerificationBypass | undefined;
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
