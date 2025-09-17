export declare const WindowType: {
    readonly IFRAME: "IFRAME";
    readonly POPUP: "POPUP";
    readonly REDIRECTION: "REDIRECTION";
    readonly UI: "UI";
};
export type WindowType = (typeof WindowType)[keyof typeof WindowType];
