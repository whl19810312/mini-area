export declare const TxServiceIssueErrorCode: {
    readonly RequestParseFailed: "RequestParseFailed";
    readonly InvalidEntityState: "InvalidEntityState";
    readonly ConfirmUrlRequired: "ConfirmUrlRequired";
    readonly StoreNotFound: "StoreNotFound";
    readonly ChannelNotFound: "ChannelNotFound";
    readonly PGProviderError: "PGProviderError";
    readonly AllChannelsNotSatisfied: "AllChannelsNotSatisfied";
    readonly BillingKeyNotFound: "BillingKeyNotFound";
    readonly UnknownError: "UnknownError";
};
export type TxServiceIssueErrorCode = (typeof TxServiceIssueErrorCode)[keyof typeof TxServiceIssueErrorCode];
