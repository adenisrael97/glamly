import { client } from "./client";

export const giftVouchersApi = {
  create: (body: {
    serviceIds: string[];
    recipientName: string;
    recipientEmail: string;
    recipientPhone?: string;
    message?: string;
    stylistId?: string;
  }) =>
    client.post<{ data: unknown }>("/gift-vouchers", body).then((r) => r.data.data),

  getByCode: (code: string) =>
    client.get<{ data: unknown }>(`/gift-vouchers/${code}`).then((r) => r.data.data),

  redeem: (
    code: string,
    body: { stylistId: string; startTime: string; notes?: string },
  ) =>
    client
      .post<{ data: unknown }>(`/gift-vouchers/${code}/redeem`, body)
      .then((r) => r.data.data),
};
