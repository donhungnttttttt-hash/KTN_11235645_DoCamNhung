const DEFAULT_TIMEOUT = 8000;
const unauthorizedListeners = new Set();
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", fieldErrors = [], requestId } = {}) {
    super(message);
    this.name = "ApiError";
    Object.assign(this, { status, code, fieldErrors, requestId });
  }
}

export function createApiClient({ baseUrl = "/api/v1", fetchImpl = (...args) => fetch(...args), timeoutMs = DEFAULT_TIMEOUT } = {}) {
  return async function request(path, { signal, headers, responseType = 'json', ...options } = {}) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(baseUrl.replace(/\/$/, "") + path, {
        ...options,
        credentials: "same-origin",
        signal: controller.signal,
        headers: { Accept: responseType === 'blob' ? '*/*' : 'application/json', ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...headers },
      });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await response.json() : null;
      if (!response.ok) {
        if (response.status === 401 && path !== "/auth/login") {
          unauthorizedListeners.forEach(listener => listener());
        }
        const defaults = { 401: "Phiên đăng nhập không hợp lệ.", 403: "Bạn không có quyền thực hiện thao tác này.", 404: "Không tìm thấy dữ liệu.", 409: "Dữ liệu đã thay đổi. Vui lòng tải lại." };
        throw new ApiError(payload?.message || defaults[response.status] || "Không thể kết nối dịch vụ. Vui lòng thử lại.", {
          status: response.status, code: payload?.code || "HTTP_ERROR",
          fieldErrors: payload?.fieldErrors || [], requestId: payload?.requestId || response.headers.get("X-Request-ID"),
        });
      }
      if (response.status === 204) return null;
      if (responseType === 'blob') return response.blob();
      if (!isJson) throw new ApiError("Phản hồi dịch vụ không đúng định dạng.", { code: "INVALID_RESPONSE" });
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
      throw new ApiError(timedOut ? "Kết nối quá thời gian chờ. Vui lòng thử lại." : "Không kết nối được backend. Vui lòng kiểm tra dịch vụ.", { code: timedOut ? "TIMEOUT" : "NETWORK_ERROR" });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  };
}

// Same-origin Vite proxy keeps local session + CSRF cookies consistent.
export const apiRequest = createApiClient();

