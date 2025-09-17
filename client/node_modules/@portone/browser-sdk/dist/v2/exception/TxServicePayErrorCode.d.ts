export declare const TxServicePayErrorCode: {
    readonly RequestParseFailed: "RequestParseFailed";
    readonly InvalidEntityState: "InvalidEntityState";
    readonly ConfirmUrlRequired: "ConfirmUrlRequired";
    readonly StoreNotFound: "StoreNotFound";
    readonly ChannelNotFound: "ChannelNotFound";
    readonly PGProviderError: "PGProviderError";
    readonly PaymentNotFound: "PaymentNotFound";
    readonly PaymentAlreadyPaid: "PaymentAlreadyPaid";
    readonly TransactionNotFound: "TransactionNotFound";
    readonly AllChannelsNotSatisfied: "AllChannelsNotSatisfied";
    readonly AmountNotEqualToPredefined: "AmountNotEqualToPredefined";
    readonly ConfirmProcessFailed: "ConfirmProcessFailed";
    readonly UnknownError: "UnknownError";
};
export type TxServicePayErrorCode = (typeof TxServicePayErrorCode)[keyof typeof TxServicePayErrorCode];
