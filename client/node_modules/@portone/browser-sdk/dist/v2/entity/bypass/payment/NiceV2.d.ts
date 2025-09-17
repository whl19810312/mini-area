import { NiceV2DisableScroll } from './NiceV2DisableScroll.js';
import { NiceV2SkinType } from './NiceV2SkinType.js';
import { NiceV2DirectCoupon } from './NiceV2DirectCoupon.js';
import { NiceV2DirectShow } from './NiceV2DirectShow.js';
import { NiceV2SamPayMallType } from './NiceV2SamPayMallType.js';
/**
 * (신)나이스페이먼츠 bypass 파라미터
 */
export type NiceV2PaymentBypass = {
    /**
     * 결제창 로고 이미지 URL
     */
    LogoImage?: string | undefined;
    /**
     * 결제창 스크롤 미사용 여부 (PC Only, Y: 미사용 / N(default): 사용)
     */
    NPDisableScroll?: NiceV2DisableScroll | undefined;
    /**
     * 결제창 스킨 색상 설정
     *
     * `"red", "green", "purple", "gray", "dark"` 중 하나의 값으로 입력해주세요.
     */
    SkinType?: NiceV2SkinType | undefined;
    /**
     * 문화 상품권 결제시 결제 고객 사용자 인증 CI 정보. 아이디/비밀번호 외 추가로 CI 인증이 필요한 경우 사용. 사용 전 영업 담당자와 사전 협의 필수
     */
    UserCI?: string | undefined;
    /**
     * 상점 사용자 아이디. 문화 상품권 결제시 경우 필수 입력
     */
    MallUserID?: string | undefined;
    /**
     * 신용카드 쿠폰 자동 적용 여부 (Y: 사전 등록된 선 할인 쿠폰을 자동 적용 / N: 쿠폰 미적용(기본값))
     *
     * 할부 거래 요청 시 할인 적용 후 승인 금액이 할부 가능 금액 (50,000) 미만인 경우 인증 실패 처리
     */
    DirectCouponYN?: NiceV2DirectCoupon | undefined;
    /**
     * 다이렉트 호출 결제 수단 (BANK: 계좌이체/CELLPHONE: 휴대폰 소액결제)
     */
    DirectShowOpt?: NiceV2DirectShow | undefined;
    /**
     * 카드사 별 호출 방식
     *
     * 형식) 카드코드:노출유형|카드코드:노출유형
     *
     * 예시) 08:3|02:3 → 롯데카드와 국민카드 선택시 앱 카드 직접 호출 방식으로 렌더링
     *
     * - 노출 유형: 1(안심클릭), 2(간편결제), 3(앱 카드 직접 호출)
     * - 카드 코드: 02(국민), 04(삼성), 06(신한), 07(현대), 08(롯데), 12(NH), 15(우리)만 가능
     */
    CardShowOpt?: string | undefined;
    /**
     * 페이코 계정 자동 로그인 기능 사용하기 위해 페이코에서 고객사에 발급한 ClientId
     */
    PaycoClientId?: string | undefined;
    /**
     * 페이코 계정 자동 로그인 기능 사용을 위한 접속 토큰
     */
    PaycoAccessToken?: string | undefined;
    /**
     * 삼성페이 고객사 유형 (01: 삼성페이 內 쇼핑 / 99: 기타 (기본값))
     */
    SamPayMallType?: NiceV2SamPayMallType | undefined;
};
