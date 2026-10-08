// Danh sách các backend URLs - Thêm URLs của các backend trên Render vào đây
export const BACKEND_URLS = [
  process.env.NEXT_PUBLIC_API_URL_1 || 'http://localhost:3002',
  process.env.NEXT_PUBLIC_API_URL_2 || '',
  process.env.NEXT_PUBLIC_API_URL_3 || '',
].filter(url => url !== ''); // Loại bỏ URL rỗng

// Timeout cho mỗi request (ms)
export const REQUEST_TIMEOUT = 5000;

// Số lần retry tối đa cho mỗi backend
export const MAX_RETRIES_PER_BACKEND = 1;
