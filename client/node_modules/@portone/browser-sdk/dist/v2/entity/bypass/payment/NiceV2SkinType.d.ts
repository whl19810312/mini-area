/**
 * 결제창 스킨 색상 설정
 *
 * `"red", "green", "purple", "gray", "dark"` 중 하나의 값으로 입력해주세요.
 */
export declare const NiceV2SkinType: {
    readonly red: "red";
    readonly green: "green";
    readonly purple: "purple";
    readonly gray: "gray";
    readonly dark: "dark";
};
/**
 * 결제창 스킨 색상 설정
 *
 * `"red", "green", "purple", "gray", "dark"` 중 하나의 값으로 입력해주세요.
 */
export type NiceV2SkinType = (typeof NiceV2SkinType)[keyof typeof NiceV2SkinType];
