import { parse } from 'csv-parse';

export interface ContactData {
  phone: string;
  name?: string;
  [key: string]: string | undefined;
}

export async function parseCSV(fileBuffer: Buffer): Promise<ContactData[]> {
  return new Promise((resolve, reject) => {
    const records: ContactData[] = [];
    const parser = parse(
      {
        columns: true,
        trim: true,
        skip_empty_lines: true,
      },
      (err, output) => {
        if (err) {
          reject(err);
          return;
        }
        const contacts = output.map((row: Record<string, string>) => {
          const phone = normalizePhone(row['phone'] || row['Phone'] || row['PHONE'] || '');
          const name = row['name'] || row['Name'] || row['NAME'] || undefined;

          const contact: ContactData = { phone, name };

          // Include all other columns as custom variables
          Object.keys(row).forEach((key) => {
            if (!['phone', 'Phone', 'PHONE', 'name', 'Name', 'NAME'].includes(key)) {
              contact[key] = row[key];
            }
          });

          return contact;
        }).filter((c: ContactData) => c.phone.length > 0);

        resolve(contacts);
      }
    );

    parser.write(fileBuffer);
    parser.end();
  });
}

export function normalizePhone(rawPhone: string): string {
  // Remove all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle Indonesian numbers
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else if (!digits.startsWith('62')) {
    digits = '62' + digits;
  }

  // Remove leading '+' if present
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  return digits;
}
