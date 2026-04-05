const WPPCONNECT_BASE_URL = process.env.WPPCONNECT_BASE_URL || 'http://localhost:21465';
const WPPCONNECT_SECRET_KEY = process.env.WPPCONNECT_SECRET_KEY || '';

if (!WPPCONNECT_SECRET_KEY) {
  console.warn('WPPCONNECT_SECRET_KEY is not set');
}

export const wppconnectConfig = {
  baseUrl: WPPCONNECT_BASE_URL,
  secretKey: WPPCONNECT_SECRET_KEY,
};

export async function wppconnectFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${WPPCONNECT_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${WPPCONNECT_SECRET_KEY}`,
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export default wppconnectConfig;
