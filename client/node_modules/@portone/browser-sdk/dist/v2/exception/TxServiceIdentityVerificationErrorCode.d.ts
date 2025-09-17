export declare const TxServiceIdentityVerificationErrorCode: {
    readonly RequestParseFailed: "RequestParseFailed";
    readonly InvalidEntityState: "InvalidEntityState";
    readonly StoreNotFound: "StoreNotFound";
    readonly ChannelNotFound: "ChannelNotFound";
    readonly PGProviderError: "PGProviderError";
    readonly IdentityVerificationAlreadyVerified: "IdentityVerificationAlreadyVerified";
    readonly AllChannelsNotSatisfied: "AllChannelsNotSatisfied";
    readonly UnknownError: "UnknownError";
};
export type TxServiceIdentityVerificationErrorCode = (typeof TxServiceIdentityVerificationErrorCode)[keyof typeof TxServiceIdentityVerificationErrorCode];
