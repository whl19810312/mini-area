export declare const CheckoutServiceErrorCode: {
    readonly BadRequest: "BadRequest";
    readonly ParseChannelFailed: "ParseChannelFailed";
    readonly ParseIdentityVerificationPrepareResponseFailed: "ParseIdentityVerificationPrepareResponseFailed";
    readonly ParseIssuePrepareResponseFailed: "ParseIssuePrepareResponseFailed";
    readonly ParsePgRawIdentityVerificationResponseFailed: "ParsePgRawIdentityVerificationResponseFailed";
    readonly ParsePgRawIssueBillingKeyResponseFailed: "ParsePgRawIssueBillingKeyResponseFailed";
    readonly ParsePgRawResponseFailed: "ParsePgRawResponseFailed";
    readonly ParsePrepareResponseFailed: "ParsePrepareResponseFailed";
};
export type CheckoutServiceErrorCode = (typeof CheckoutServiceErrorCode)[keyof typeof CheckoutServiceErrorCode];
