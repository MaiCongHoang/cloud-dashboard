import { BACKEND_URLS, REQUEST_TIMEOUT, MAX_RETRIES_PER_BACKEND } from '../config/backends';

// Lưu trữ backend đang hoạt động (để ưu tiên gọi backend này trước)
let currentActiveBackendIndex = 0;

// Lưu trạng thái health của các backend
const backendHealth: Map<string, { healthy: boolean; lastChecked: number }> = new Map();

/**
 * Kiểm tra backend có healthy không (cache 30 giây)
 */
function isBackendHealthy(url: string): boolean {
  const health = backendHealth.get(url);
  if (!health) return true; // Chưa check thì coi như healthy
  
  // Nếu đã check quá 30 giây thì reset
  if (Date.now() - health.lastChecked > 30000) {
    backendHealth.delete(url);
    return true;
  }
  
  return health.healthy;
}

/**
 * Đánh dấu backend là unhealthy
 */
function markBackendUnhealthy(url: string) {
  backendHealth.set(url, { healthy: false, lastChecked: Date.now() });
  console.warn(`⚠️ Backend ${url} được đánh dấu là UNHEALTHY`);
}

/**
 * Đánh dấu backend là healthy
 */
function markBackendHealthy(url: string) {
  backendHealth.set(url, { healthy: true, lastChecked: Date.now() });
}

/**
 * Fetch với timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Sắp xếp backends theo thứ tự ưu tiên
 * - Backend đang active được ưu tiên đầu
 * - Backend healthy được ưu tiên hơn unhealthy
 */
function getPrioritizedBackends(): string[] {
  const backends = [...BACKEND_URLS];
  
  // Đưa backend đang active lên đầu
  if (currentActiveBackendIndex > 0 && currentActiveBackendIndex < backends.length) {
    const activeBackend = backends.splice(currentActiveBackendIndex, 1)[0];
    backends.unshift(activeBackend);
  }
  
  // Sắp xếp healthy lên trước
  return backends.sort((a, b) => {
    const aHealthy = isBackendHealthy(a);
    const bHealthy = isBackendHealthy(b);
    if (aHealthy && !bHealthy) return -1;
    if (!aHealthy && bHealthy) return 1;
    return 0;
  });
}

/**
 * API Client với tính năng failover tự động
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const backends = getPrioritizedBackends();
  const errors: string[] = [];

  for (let i = 0; i < backends.length; i++) {
    const backendUrl = backends[i];
    
    // Bỏ qua backend đã được đánh dấu unhealthy (nhưng vẫn thử nếu không còn backend nào khác)
    if (!isBackendHealthy(backendUrl) && i < backends.length - 1) {
      console.log(`⏭️ Bỏ qua backend unhealthy: ${backendUrl}`);
      continue;
    }

    for (let retry = 0; retry <= MAX_RETRIES_PER_BACKEND; retry++) {
      try {
        console.log(`🔄 Đang gọi backend: ${backendUrl}${endpoint} (lần ${retry + 1})`);
        
        const response = await fetchWithTimeout(`${backendUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Thành công - đánh dấu backend healthy
        markBackendHealthy(backendUrl);
        currentActiveBackendIndex = BACKEND_URLS.indexOf(backendUrl);
        
        console.log(`✅ Thành công từ backend: ${backendUrl}`);
        
        // Xử lý response rỗng
        const text = await response.text();
        if (!text) return {} as T;
        
        return JSON.parse(text) as T;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${backendUrl}: ${errorMessage}`);
        
        console.error(`❌ Lỗi từ backend ${backendUrl}:`, errorMessage);
        
        // Nếu đã retry đủ số lần, đánh dấu unhealthy và chuyển sang backend khác
        if (retry === MAX_RETRIES_PER_BACKEND) {
          markBackendUnhealthy(backendUrl);
        }
      }
    }
  }

  // Tất cả backends đều fail
  throw new Error(`Tất cả ${backends.length} backends đều không khả dụng:\n${errors.join('\n')}`);
}

/**
 * Lấy URL của backend đang hoạt động (dùng cho Socket.IO)
 */
export function getActiveBackendUrl(): string {
  const backends = getPrioritizedBackends();
  return backends[0] || BACKEND_URLS[0];
}

/**
 * Health check tất cả backends
 */
export async function checkAllBackendsHealth(): Promise<{ url: string; healthy: boolean }[]> {
  const results = await Promise.all(
    BACKEND_URLS.map(async (url) => {
      try {
        const response = await fetchWithTimeout(`${url}/`, {}, 3000);
        const healthy = response.ok;
        if (healthy) {
          markBackendHealthy(url);
        } else {
          markBackendUnhealthy(url);
        }
        return { url, healthy };
      } catch {
        markBackendUnhealthy(url);
        return { url, healthy: false };
      }
    })
  );
  
  console.log('🏥 Backend Health Check:', results);
  return results;
}

// === Các helper methods cho REST API ===

export const api = {
  get: <T>(endpoint: string) => apiCall<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data: unknown) =>
    apiCall<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  put: <T>(endpoint: string, data: unknown) =>
    apiCall<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
  delete: <T>(endpoint: string) => apiCall<T>(endpoint, { method: 'DELETE' }),
};
