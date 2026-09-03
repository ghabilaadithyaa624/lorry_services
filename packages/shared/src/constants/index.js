export const LOGISTICS_CORRIDORS = {
    PUNE_TO_BANGALORE: {
        origin: { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
        destination: { name: 'Bangalore, Karnataka', lat: 12.9716, lng: 77.5946 },
        approxDistanceKm: 840,
        checkpoints: [
            { name: 'Pune MIDC Chakan', lat: 18.5204, lng: 73.8567 },
            { name: 'Satara Toll Plaza', lat: 17.6805, lng: 74.0183 },
            { name: 'Kolhapur Bypass Toll', lat: 16.7050, lng: 74.2237 },
            { name: 'Belagavi Border', lat: 15.8497, lng: 74.4977 },
            { name: 'Hubballi Bypass', lat: 15.3647, lng: 75.1240 },
            { name: 'Tumakuru Toll', lat: 13.3409, lng: 77.1006 },
            { name: 'Bangalore Peenya', lat: 12.9716, lng: 77.5946 },
        ],
    },
};
export const TRUCK_TYPES = ['Open', 'Container', 'Open body'];
/** Duration (in days) of the one-time free trial granted to every account. */
export const TRIAL_DURATION_DAYS = 90;
/** Supported payment gateways for subscription checkout. */
export const PAYMENT_PROVIDERS = ['cashfree', 'razorpay', 'stripe'];
/** Subscribable plans. Prices in INR (whole rupees). */
export const SUBSCRIPTION_PLANS = {
    monthly: { price: 999, durationDays: 30, label: 'Monthly Unlimited' },
    quarterly: { price: 2499, durationDays: 90, label: 'Quarterly Unlimited' },
    annual: { price: 7999, durationDays: 365, label: 'Annual Unlimited' },
};
//# sourceMappingURL=index.js.map