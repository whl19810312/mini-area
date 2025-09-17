import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
/**
 * **리디렉션 없이 결제 UI가 표시된 경우 반환값**
 */
export type IdentityVerificationResponse = {
    /**
     * **트랜잭션 유형**
     *
     * 본인인증의 경우 경우 항상 `IDENTITY_VERIFICATION`으로 전달됩니다.
     */
    transactionType: 'IDENTITY_VERIFICATION';
    /**
     * **본인인증 ID**
     *
     * 본인인증 ID입니다.
     */
    identityVerificationId: string;
    /**
     * **본인인증 시도 ID**
     *
     * 요청마다 고유하게 생성되는 본인인증 시도 ID입니다.
     */
    identityVerificationTxId: string;
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
