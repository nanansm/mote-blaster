import { google } from 'googleapis';
import { ContactData } from '../utils/csvParser';

const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required');
}

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function fetchSheetData(spreadsheetId: string): Promise<ContactData[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:Z',
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      throw new Error('Sheet is empty');
    }

    const headers = values[0].map((h: string) => h.toLowerCase().trim());
    const phoneHeaderIndex = headers.findIndex(
      (h: string) => h === 'phone' || h === 'phonenumber' || h === 'phone_number'
    );

    if (phoneHeaderIndex === -1) {
      throw new Error('Sheet must have a "phone" column');
    }

    const contacts: ContactData[] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const phone = String(row[phoneHeaderIndex] || '').trim();

      if (!phone) continue;

      const contact: ContactData = {
        phone: phone.replace(/\D/g, ''),
      };

      // Map other columns as variables
      headers.forEach((header: string, index: number) => {
        if (index !== phoneHeaderIndex) {
          contact[header] = row[index] ? String(row[index]).trim() : undefined;
        }
      });

      contacts.push(contact);
    }

    return contacts;
  } catch (error: any) {
    if (error.code === 403) {
      throw new Error('Sheet is private. Set sharing to "Anyone with link can view"');
    }
    if (error.code === 404) {
      throw new Error('Sheet not found. Check the URL');
    }
    throw error;
  }
}
