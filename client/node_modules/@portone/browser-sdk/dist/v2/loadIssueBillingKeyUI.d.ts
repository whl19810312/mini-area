import type { LoadIssueBillingKeyUIRequest } from './request/LoadIssueBillingKeyUIRequest.js';
import type { IssueBillingKeyResponse } from './response/IssueBillingKeyResponse.js';
import type { IssueBillingKeyError } from './exception/IssueBillingKeyError.js';
export declare function loadIssueBillingKeyUI(request: LoadIssueBillingKeyUIRequest, callbacks: {
    onIssueBillingKeySuccess: (response: IssueBillingKeyResponse) => void;
    onIssueBillingKeyFail: (error: IssueBillingKeyError) => void;
}): Promise<void>;
