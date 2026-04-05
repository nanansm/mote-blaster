import { wppconnectFetch } from '../config/wppconnect';
import { prisma } from '../config/database';

export class WPPConnectService {
  async startSession(sessionName: string): Promise<{ qrCode?: string; status: string }> {
    try {
      const response = await wppconnectFetch(`/api/${sessionName}/start-session`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`WPPConnect error: ${response.statusText}`);
      }

      const data = await response.json() as { qrCode?: string; status: string };
      return data;
    } catch (error) {
      console.error('startSession error:', error);
      throw error;
    }
  }

  async getSessionStatus(sessionName: string): Promise<string> {
    try {
      const response = await wppconnectFetch(`/api/${sessionName}/status-session`, {
        method: 'GET',
      });

      if (!response.ok) {
        return 'ERROR';
      }

      const data = await response.json() as { status: string };
      return data.status || 'DISCONNECTED';
    } catch (error) {
      console.error('getSessionStatus error:', error);
      return 'ERROR';
    }
  }

  async getQRCode(sessionName: string): Promise<string | null> {
    try {
      const response = await wppconnectFetch(`/api/${sessionName}/qrcode-session`, {
        method: 'GET',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { qrcode?: string; base64?: string };
      return data.qrcode || data.base64 || null;
    } catch (error) {
      console.error('getQRCode error:', error);
      return null;
    }
  }

  async sendMessage(
    sessionName: string,
    phone: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await wppconnectFetch(`/api/${sessionName}/send-message`, {
        method: 'POST',
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json() as { messageId?: string; id?: string };
      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (error) {
      console.error('sendMessage error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async closeSession(sessionName: string): Promise<void> {
    try {
      await wppconnectFetch(`/api/${sessionName}/close-session`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('closeSession error:', error);
    }
  }

  async deleteSession(sessionName: string): Promise<void> {
    try {
      await wppconnectFetch(`/api/${sessionName}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('deleteSession error:', error);
    }
  }
}

export const wppConnectService = new WPPConnectService();
