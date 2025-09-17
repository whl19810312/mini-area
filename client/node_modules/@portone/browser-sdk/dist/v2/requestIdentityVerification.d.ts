import type { IdentityVerificationRequest } from './request/IdentityVerificationRequest.js';
import type { IdentityVerificationResponse } from './response/IdentityVerificationResponse.js';
export declare function requestIdentityVerification(request: IdentityVerificationRequest): Promise<IdentityVerificationResponse | undefined>;
