import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentStatusResult,
} from "@glamly/shared";
import { client, unwrap } from "./client";

export const paymentsApi = {
  /** Start a Paystack checkout for a booking the customer owns. */
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return unwrap<InitiatePaymentResult>(client.post("/payments/initiate", input));
  },

  /** Poll payment status after returning from the hosted checkout. */
  getStatus(reference: string): Promise<PaymentStatusResult> {
    return unwrap<PaymentStatusResult>(client.get(`/payments/${reference}`));
  },
};
