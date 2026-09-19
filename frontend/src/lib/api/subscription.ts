import { apiGet, apiPost } from "./client";

const SUBSCRIPTION_PREFIX = "/api/subscription";

export interface SubscriptionStatus {
  is_subscriber: boolean;
  last_validation: string; // date
  expiration_date: string; // date
}

export function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiGet<SubscriptionStatus>(`${SUBSCRIPTION_PREFIX}/`, { auth: true });
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  duration: number; // روز
  price: number;
}

// طبق مستندات آرایه‌ی flat برمیگرده؛ اگه بعداً معلوم شد پیجینیت‌شده‌ست (پیجینیشن پیش‌فرض پروژه)
// باید به PaginatedResponse<SubscriptionPlan> تغییر کنه — دقیقاً مثل داستان genre/studio قبلی
export function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiGet<SubscriptionPlan[]>(`${SUBSCRIPTION_PREFIX}/plan/`);
}

export interface PurchaseSubscriptionResponse {
  payment_url: string;
}

export function purchaseSubscription(planId: number): Promise<PurchaseSubscriptionResponse> {
  return apiPost<PurchaseSubscriptionResponse>(
    `${SUBSCRIPTION_PREFIX}/`,
    { plan: planId },
    { auth: true }
  );
}

export interface SubscriptionOrder {
  plan: SubscriptionPlan;
  is_paid: boolean;
  is_consumed: boolean;
  created_at: string;
}

// طبق مستندات آرایه‌ی flat برمیگرده — همون هشدار بالا اینجا هم صدق می‌کنه
export function getSubscriptionOrders(): Promise<SubscriptionOrder[]> {
  return apiGet<SubscriptionOrder[]>(`${SUBSCRIPTION_PREFIX}/order/`, { auth: true });
}

export function verifySubscriptionPayment(
  authority: string,
  status: string
): Promise<void> {
  const params = new URLSearchParams({ Authority: authority, Status: status });
  return apiGet<void>(`${SUBSCRIPTION_PREFIX}/verify/?${params.toString()}`, { auth: true });
}