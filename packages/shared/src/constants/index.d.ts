export declare const LOGISTICS_CORRIDORS: {
    PUNE_TO_BANGALORE: {
        origin: {
            name: string;
            lat: number;
            lng: number;
        };
        destination: {
            name: string;
            lat: number;
            lng: number;
        };
        approxDistanceKm: number;
        checkpoints: {
            name: string;
            lat: number;
            lng: number;
        }[];
    };
};
export declare const TRUCK_TYPES: readonly ["Open", "Container", "Open body"];
/** Duration (in days) of the one-time free trial granted to every account. */
export declare const TRIAL_DURATION_DAYS = 90;
/** Supported payment gateways for subscription checkout. */
export declare const PAYMENT_PROVIDERS: readonly ["cashfree", "razorpay", "stripe"];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
/** Subscribable plans. Prices in INR (whole rupees). */
export declare const SUBSCRIPTION_PLANS: {
    readonly monthly: {
        readonly price: 999;
        readonly durationDays: 30;
        readonly label: "Monthly Unlimited";
    };
    readonly quarterly: {
        readonly price: 2499;
        readonly durationDays: 90;
        readonly label: "Quarterly Unlimited";
    };
    readonly annual: {
        readonly price: 7999;
        readonly durationDays: 365;
        readonly label: "Annual Unlimited";
    };
};
export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
/**
 * Entitlement state returned by GET /subscriptions/status.
 * `status` is one of: 'trial' (active trial, no paid plan), 'active' (paid),
 * 'expired' (trial over, no paid plan).
 */
export interface SubscriptionEntitlement {
    status: 'trial' | 'active' | 'expired';
    hasSubscription: boolean;
    hasPremiumAccess: boolean;
    isTrialActive: boolean;
    plan: SubscriptionPlanId | null;
    expiresAt: string | null;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    trialDaysRemaining: number;
    trialDurationDays: number;
    upgradeRequired: boolean;
    upgradeReason: string | null;
}
//# sourceMappingURL=index.d.ts.map