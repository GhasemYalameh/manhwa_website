const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost";

// سمت سرور (SSR داخل کانتینر) باید از آدرس داخلی شبکه‌ی داکر بره، نه localhost
const BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_BASE_URL ?? PUBLIC_API_URL
    : PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `درخواست با کد ${status} ناموفق بود`);
    this.status = status;
    this.body = body;
  }
}

// --- مدیریت توکن‌ها در localStorage ---
// این بخش قبلاً در lib/api/auth.ts بود؛ به اینجا منتقل شد چون apiPost خودش
// برای منطق رفرش خودکار به این توابع نیاز داره. auth.ts این توابع رو دوباره export می‌کنه.

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// --- fetch خام، بدون منطق ریفرش ---
// فقط همینجا استفاده میشه (هم برای درخواست‌های معمولی، هم خود اندپوینت refresh)
// تا حلقه‌ی بی‌نهایت (رفرش → ۴۰۱ → رفرش → ...) پیش نیاد.

async function rawPost<TResponse>(
  path: string,
  body: unknown,
  accessToken?: string
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as TResponse;
}

const REFRESH_PATH = "/api/account/jwt/refresh/";

interface RefreshResponse {
  access: string;
  refresh: string;
}

// اگه چند ریکوئست همزمان به ۴۰۱ بخورن، فقط یک بار رفرش انجام میشه
// و بقیه منتظر همون یک promise می‌مونن (به‌جای اینکه هرکدوم جدا رفرش بزنن).
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(null);

  refreshPromise = rawPost<RefreshResponse>(REFRESH_PATH, { refresh })
    .then((res) => {
      storeTokens(res.access, res.refresh);
      return res.access;
    })
    .catch(() => {
      // رفرش توکن هم نامعتبر/منقضی بوده؛ کاربر باید دوباره لاگین کنه
      clearTokens();
      return null;
    })
    .finally(() => {
      ""
      refreshPromise = null;
    });

  return refreshPromise;
}

interface ApiPostOptions {
  // برای اندپوینت‌هایی که نیاز به access token دارن (هدر Authorization: JWT <token>).
  // وقتی true باشه و به ۴۰۱ بخوره، خودکار رفرش می‌گیره و یک‌بار دوباره تلاش می‌کنه.
  auth?: boolean;
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown,
  options: ApiPostOptions = {}
): Promise<TResponse> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawPost<TResponse>(path, body, token);
  } catch (err) {
    const shouldRetry =
      auth && err instanceof ApiError && err.status === 401 && path !== REFRESH_PATH;

    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err; // رفرش هم شکست خورد؛ همون خطای اولیه (۴۰۱) بالا میره

    return rawPost<TResponse>(path, body, newAccessToken);
  }
}


async function rawGet<TResponse>(path: string, accessToken?: string): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as TResponse;
}

export async function apiGet<TResponse>(
  path: string,
  options: ApiPostOptions = {}
): Promise<TResponse> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawGet<TResponse>(path, token);
  } catch (err) {
    const shouldRetry = auth && err instanceof ApiError && err.status === 401;
    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err;

    return rawGet<TResponse>(path, newAccessToken);
  }
}
async function rawPatch<TResponse>(
  path: string,
  body: unknown,
  accessToken?: string
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as TResponse;
}

export async function apiPatch<TResponse>(
  path: string,
  body: unknown,
  options: ApiPostOptions = {}
): Promise<TResponse> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawPatch<TResponse>(path, body, token);
  } catch (err) {
    const shouldRetry = auth && err instanceof ApiError && err.status === 401;
    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err;

    return rawPatch<TResponse>(path, body, newAccessToken);
  }
}

async function rawPatchForm<TResponse>(
  path: string,
  formData: FormData,
  accessToken?: string
): Promise<TResponse> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
    body: formData,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }

  return data as TResponse;
}

// برای PATCH هایی که شامل فایل هستن (مثل آپلود کاور پروفایل) — بدون Content-Type دستی
export async function apiPatchForm<TResponse>(
  path: string,
  formData: FormData,
  options: ApiPostOptions = {}
): Promise<TResponse> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawPatchForm<TResponse>(path, formData, token);
  } catch (err) {
    const shouldRetry = auth && err instanceof ApiError && err.status === 401;
    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err;

    return rawPatchForm<TResponse>(path, formData, newAccessToken);
  }
}

async function rawDelete(path: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
  });

  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    throw new ApiError(res.status, data);
  }
}

export async function apiDelete(path: string, options: ApiPostOptions = {}): Promise<void> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawDelete(path, token);
  } catch (err) {
    const shouldRetry = auth && err instanceof ApiError && err.status === 401;
    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err;

    return rawDelete(path, newAccessToken);
  }
}

async function rawGetBlob(path: string, accessToken?: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(accessToken ? { Authorization: `JWT ${accessToken}` } : {}),
    },
  });

  if (!res.ok) {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;
    throw new ApiError(res.status, data);
  }

  return res.blob();
}

// برای اندپوینت‌هایی که خود تصویر (باینری) برمی‌گردونن، نه JSON — مثل تصاویر محافظت‌شده‌ی چپتر
export async function apiGetBlob(path: string, options: ApiPostOptions = {}): Promise<Blob> {
  const { auth = false } = options;
  const token = auth ? getAccessToken() ?? undefined : undefined;

  try {
    return await rawGetBlob(path, token);
  } catch (err) {
    const shouldRetry = auth && err instanceof ApiError && err.status === 401;
    if (!shouldRetry) throw err;

    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) throw err;

    return rawGetBlob(path, newAccessToken);
  }
}