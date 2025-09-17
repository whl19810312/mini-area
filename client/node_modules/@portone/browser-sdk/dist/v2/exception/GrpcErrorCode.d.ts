export declare const GrpcErrorCode: {
    /**
     * 0/200
     */
    readonly Ok: "Ok";
    /**
     * 1/422
     */
    readonly Cancelled: "Cancelled";
    /**
     * 2/500
     */
    readonly Unknown: "Unknown";
    /**
     * 3/400
     */
    readonly InvalidArgument: "InvalidArgument";
    /**
     * 4/504
     */
    readonly DeadlineExceeded: "DeadlineExceeded";
    /**
     * 5/404
     */
    readonly NotFound: "NotFound";
    /**
     * 6/409
     */
    readonly AlreadyExists: "AlreadyExists";
    /**
     * 7/403
     */
    readonly PermissionDenied: "PermissionDenied";
    /**
     * 8/429
     */
    readonly ResourceExhausted: "ResourceExhausted";
    /**
     * 9/400
     */
    readonly FailedPrecondition: "FailedPrecondition";
    /**
     * 10/409
     */
    readonly Aborted: "Aborted";
    /**
     * 11/400
     */
    readonly OutOfRange: "OutOfRange";
    /**
     * 2/501
     */
    readonly Unimplemented: "Unimplemented";
    /**
     * 13/500
     */
    readonly Internal: "Internal";
    /**
     * 14/503
     */
    readonly Unavailable: "Unavailable";
    /**
     * 15/500
     */
    readonly DataLoss: "DataLoss";
    /**
     * 16/401
     */
    readonly Unauthenticated: "Unauthenticated";
};
export type GrpcErrorCode = (typeof GrpcErrorCode)[keyof typeof GrpcErrorCode];
