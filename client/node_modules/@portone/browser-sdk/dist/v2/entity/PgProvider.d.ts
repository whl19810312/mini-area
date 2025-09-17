/**
 * **PG사 구분코드**
 */
export declare const PgProvider: {
    readonly HTML5_INICIS: "HTML5_INICIS";
    readonly PAYPAL: "PAYPAL";
    readonly INICIS: "INICIS";
    readonly DANAL: "DANAL";
    readonly NICE: "NICE";
    readonly DANAL_TPAY: "DANAL_TPAY";
    readonly UPLUS: "UPLUS";
    readonly NAVERPAY: "NAVERPAY";
    readonly SETTLE: "SETTLE";
    readonly KCP: "KCP";
    readonly MOBILIANS: "MOBILIANS";
    readonly KAKAOPAY: "KAKAOPAY";
    readonly NAVERCO: "NAVERCO";
    readonly KICC: "KICC";
    readonly EXIMBAY: "EXIMBAY";
    readonly SMILEPAY: "SMILEPAY";
    readonly PAYCO: "PAYCO";
    readonly KCP_BILLING: "KCP_BILLING";
    readonly ALIPAY: "ALIPAY";
    readonly CHAI: "CHAI";
    readonly BLUEWALNUT: "BLUEWALNUT";
    readonly SMARTRO: "SMARTRO";
    readonly PAYMENTWALL: "PAYMENTWALL";
    readonly TOSSPAYMENTS: "TOSSPAYMENTS";
    readonly KCP_QUICK: "KCP_QUICK";
    readonly DAOU: "DAOU";
    readonly GALAXIA: "GALAXIA";
    readonly TOSSPAY: "TOSSPAY";
    readonly KCP_DIRECT: "KCP_DIRECT";
    readonly SETTLE_ACC: "SETTLE_ACC";
    readonly SETTLE_FIRM: "SETTLE_FIRM";
    readonly INICIS_UNIFIED: "INICIS_UNIFIED";
    readonly KSNET: "KSNET";
    readonly PAYPAL_V2: "PAYPAL_V2";
    readonly SMARTRO_V2: "SMARTRO_V2";
    readonly NICE_V2: "NICE_V2";
    readonly TOSS_BRANDPAY: "TOSS_BRANDPAY";
    readonly WELCOME: "WELCOME";
    readonly TOSSPAY_V2: "TOSSPAY_V2";
    readonly INICIS_V2: "INICIS_V2";
    readonly KPN: "KPN";
    readonly KCP_V2: "KCP_V2";
    readonly HYPHEN: "HYPHEN";
    readonly EXIMBAY_V2: "EXIMBAY_V2";
};
/**
 * **PG사 구분코드**
 */
export type PgProvider = (typeof PgProvider)[keyof typeof PgProvider] | `PG_PROVIDER_${(typeof PgProvider)[keyof typeof PgProvider]}`;
