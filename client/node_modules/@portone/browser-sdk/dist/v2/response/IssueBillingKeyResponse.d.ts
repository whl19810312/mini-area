import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
/**
 * **리디렉션 없이 빌링키 발급 UI가 표시된 경우 반환값**
 */
export type IssueBillingKeyResponse = {
    /**
     * `ISSUE_BILLING_KEY`
     */
    transactionType: 'ISSUE_BILLING_KEY';
    /**
     * **빌링키**
     *
     * 빌링 결제를 일으킬 때 사용하는 빌링키입니다. 수동 승인 사용시 'NEEDS\_CONFIRMATION'으로 전달됩니다.
     */
    billingKey: string;
    /**
     * 수동 승인 사용시 수동 승인 API 호출에 필요한 토큰입니다.
     */
    billingIssueToken?: string | undefined;
    /**
     * **오류 코드**
     *
     * 실패한 경우 오류 코드입니다.
     */
    code?: string | undefined;
    /**
     * **오류 메시지**
     *
     * 실패한 경우 오류 메시지입니다.
     */
    message?: string | undefined;
    /**
     * **PG 오류 코드**
     *
     * PG에서 오류 코드를 내려 주는 경우 이 오류 코드를 그대로 반환합니다.
     */
    pgCode?: PgCode | undefined;
    /**
     * **PG 오류 메시지**
     *
     * PG에서 오류 메시지를 내려 주는 경우 이 오류 메시지를 그대로 반환합니다.
     */
    pgMessage?: PgMessage | undefined;
};
