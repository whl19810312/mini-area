import { WindowType } from './WindowType.js';
/**
 * **환경 별 제공되는 결제/본인인증 창 유형**
 *
 * - PG사에 따라 가능한 창 유형이 다릅니다.
 * - 전달되지 않았을 때 결정되는 기본 창이 다릅니다.
 * - 미입력 시, 해당 PG사의 기본 창 방식을 따릅니다.
 */
export type WindowTypes = {
    /**
     * **PC에서의 결제창 유형** `IFRAME`, `REDIRECTION`, `POPUP` 중 하나를 입력해주세요.
     */
    pc?: WindowType | undefined;
    /**
     * **모바일에서의 결제창 유형** `IFRAME`, `REDIRECTION`, `POPUP` 중 하나를 입력해주세요.
     */
    mobile?: WindowType | undefined;
};
