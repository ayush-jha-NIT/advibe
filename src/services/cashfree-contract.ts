/**
 * Frontend-only integration contract. NO payments are executed in Part 3.
 * Production backend creates Cashfree orders and verifies their final status.
 */
export interface CashfreeCheckoutSession {
 orderId:string;
 paymentSessionId:string;
 environment:"sandbox"|"production";
}
export interface CheckoutBackend {
 createOrder(input:{campaignId:string;amountPaise:number}):Promise<CashfreeCheckoutSession>;
 getVerifiedStatus(orderId:string):Promise<"paid"|"pending"|"failed">;
}
/** Never trust frontend redirects or mock store flags as proof of payment. */
export function assertVerifiedPayment(status:"paid"|"pending"|"failed"){
 if(status!=="paid")throw Error("Backend-confirmed payment required");
 return true;
}
