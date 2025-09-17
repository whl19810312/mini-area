/**
 * 위젯에 보여줄 결제 수단. 예) 카드 전달시 등록한 결제 수단 중 카드만 노출 됨
 */
export declare const TossBrandpayWidgetOptionsMethodType: {
    readonly CARD: "카드";
    readonly ACCOUNT: "계좌";
};
/**
 * 위젯에 보여줄 결제 수단. 예) 카드 전달시 등록한 결제 수단 중 카드만 노출 됨
 */
export type TossBrandpayWidgetOptionsMethodType = (typeof TossBrandpayWidgetOptionsMethodType)[keyof typeof TossBrandpayWidgetOptionsMethodType];
