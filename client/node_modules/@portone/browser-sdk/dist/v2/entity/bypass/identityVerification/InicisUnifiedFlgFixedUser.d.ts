/**
 * **인증 창에서 고객 정보를 미리 채울지 여부**
 *
 * `Y`, `N` 중 하나를 입력해주세요.
 *
 * `Y`인 경우 이름, 연락처, 출생년도, 출생월, 출생일을 필수로 입력해야 합니다.
 */
export declare const InicisUnifiedFlgFixedUser: {
    readonly Y: "Y";
    readonly N: "N";
};
/**
 * **인증 창에서 고객 정보를 미리 채울지 여부**
 *
 * `Y`, `N` 중 하나를 입력해주세요.
 *
 * `Y`인 경우 이름, 연락처, 출생년도, 출생월, 출생일을 필수로 입력해야 합니다.
 */
export type InicisUnifiedFlgFixedUser = (typeof InicisUnifiedFlgFixedUser)[keyof typeof InicisUnifiedFlgFixedUser];
