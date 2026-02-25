import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getValidToken } from './token-manager';

export function createLTKClient(slug: string): AxiosInstance {
  const client = axios.create({
    timeout: 30000,
  });

  client.interceptors.request.use(async (config) => {
    const token = await getValidToken(slug);
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Force a fresh token and retry once
        try {
          const token = await getValidToken(slug);
          const config: AxiosRequestConfig = error.config ?? {};
          config.headers = config.headers ?? {};
          config.headers['Authorization'] = `Bearer ${token}`;
          return client(config);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  );

  return client;
}
