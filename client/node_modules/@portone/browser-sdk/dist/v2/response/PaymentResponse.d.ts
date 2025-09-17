import type { PgCode } from '../entity/PgCode.js';
import type { PgMessage } from '../entity/PgMessage.js';
/**
 * **리디렉션 없이 결제 UI가 표시된 경우 반환값**
 */
export type PaymentResponse = {
    /**
     * **유형**
     *
     * 일반결제의 경우 무조건 `PAYMENT`로 전달됩니다.
     */
    transactionType: 'PAYMENT';
    /**
     * **결제 시도 ID**
     *
     * 요청마다 고유하게 생성되는 결제 시도 ID입니다.
     */
    txId: string;
    /**
     * **결제 ID**
     */
    paymentId: string;
    /**
     * **결제 토큰**
     *
     * 수동 승인 사용시 수동 승인 API 호출에 필요한 토큰입니다.
     */
    paymentToken?: string | undefined;
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
