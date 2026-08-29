/**
 * sheets.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Google Sheets API client (Read & Write).
 *
 * Supports two authentication strategies (tried in order):
 *
 *   1. Service Account JSON file  (GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH)
 *      Place the downloaded JSON key at the path relative to the project root.
 *      e.g.  config/service-account.json
 *      Make sure the spreadsheet is shared with the service account email as Editor.
 *
 *   2. API Key  (GOOGLE_SHEETS_API_KEY)
 *      Works for reading publicly shared spreadsheets.
 *
 *   3. Base64-encoded service account (GOOGLE_SERVICE_ACCOUNT_KEY) — legacy
 * ─────────────────────────────────────────────────────────────────────────────
 */

import path from "path";
import fs from "fs";
import { google, sheets_v4 } from "googleapis";

// ── Module-level singleton ──────────────────────────────────────────────────
let _sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Returns (and lazily initialises) the authenticated Sheets client.
 * Scope is full `https://www.googleapis.com/auth/spreadsheets` for read + write.
 */
function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient;

  // ── Strategy 1: Service Account JSON file (recommended) ────────────────
  let serviceAccountPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH;
  
  // Auto-discover if config folder has a json key file
  const configDir = path.join(process.cwd(), "config");
  if (!serviceAccountPath && fs.existsSync(configDir)) {
    const jsonFiles = fs.readdirSync(configDir).filter(f => f.endsWith(".json"));
    if (jsonFiles.length > 0) {
      serviceAccountPath = path.join("config", jsonFiles[0]);
    }
  }

  if (serviceAccountPath) {
    let absolutePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.join(process.cwd(), serviceAccountPath);

    // If specific file not found, try finding any JSON in config/
    if (!fs.existsSync(absolutePath) && fs.existsSync(configDir)) {
      const jsonFiles = fs.readdirSync(configDir).filter(f => f.endsWith(".json"));
      if (jsonFiles.length > 0) {
        absolutePath = path.join(configDir, jsonFiles[0]);
      }
    }

    if (fs.existsSync(absolutePath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        _sheetsClient = google.sheets({ version: "v4", auth });
        console.log(
          "[sheets.ts] Authenticated (Read/Write) via service account file:",
          absolutePath
        );
        return _sheetsClient;
      } catch (err) {
        console.warn(
          "[sheets.ts] Failed to load service account file, trying next method:",
          (err as Error).message
        );
      }
    } else {
      console.warn(
        `[sheets.ts] Service account file not found at "${absolutePath}". Trying next auth method.`
      );
    }
  }

  // ── Strategy 2: API Key (public read-only) ──────────────────────────────
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    _sheetsClient = google.sheets({ version: "v4" });
    (global as any).__sheetsApiKey = apiKey;
    console.log("[sheets.ts] Authenticated via API key.");
    return _sheetsClient;
  }

  // ── Strategy 3: Base64-encoded service account key (legacy) ────────────
  const encodedKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (
    encodedKey &&
    encodedKey !== "<BASE64_ENCODED_SERVICE_ACCOUNT_JSON>" &&
    encodedKey.trim() !== ""
  ) {
    try {
      const json = Buffer.from(encodedKey, "base64").toString("utf-8");
      const credentials = JSON.parse(json);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      _sheetsClient = google.sheets({ version: "v4", auth });
      console.log("[sheets.ts] Authenticated via base64 service account key.");
      return _sheetsClient;
    } catch {
      console.warn(
        "[sheets.ts] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY, ignoring."
      );
    }
  }

  throw new Error(
    "[sheets.ts] No valid Google Sheets credentials found.\n" +
      "Set one of the following in .env.local:\n" +
      "  • GOOGLE_SHEETS_SERVICE_ACCOUNT_PATH=config/service-account.json\n" +
      "  • GOOGLE_SHEETS_API_KEY=<your-api-key>  (public sheets only)\n" +
      "  • GOOGLE_SERVICE_ACCOUNT_KEY=<base64-encoded-json>"
  );
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Reads a range from a Google Spreadsheet and returns raw cell values.
 */
export async function readSheet(
  spreadsheetId?: string,
  range?: string
): Promise<string[][]> {
  const id =
    spreadsheetId ||
    process.env.ROUTINE_SHEET_ID ||
    process.env.ROUTINE_SPREADSHEET_ID;

  const r =
    range ||
    process.env.ROUTINE_SHEET_RANGE ||
    "Sheet1!A2:F";

  if (!id) {
    throw new Error(
      "[sheets.ts] No spreadsheet ID provided. " +
        "Pass it explicitly or set ROUTINE_SHEET_ID in .env.local."
    );
  }

  const sheets = getSheetsClient();
  const apiKey = (global as any).__sheetsApiKey as string | undefined;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: r,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
    ...(apiKey ? { key: apiKey } : {}),
  });

  const rawRows = response.data.values ?? [];

  return rawRows.map((row) =>
    (row as unknown[]).map((cell) =>
      cell === null || cell === undefined ? "" : String(cell).trim()
    )
  );
}

/**
 * Appends a single row of routine values to the master Google Sheet.
 * Values format: [Course (Col A), Sec (Col B), Room (Col C), Day (Col D), Time (Col E), Teacher (Col F)]
 * e.g. ["CSE471", "01", "UB80201", "Sunday", "09:30-11:00", "AQU"]
 */
export async function appendSheetRow(
  spreadsheetId: string,
  sheetName: string = "Sheet1",
  rowValues: string[]
): Promise<{ ok: boolean; updatedRange?: string; error?: string }> {
  try {
    const id = spreadsheetId || process.env.ROUTINE_SHEET_ID || process.env.ROUTINE_SPREADSHEET_ID;
    if (!id) {
      return { ok: false, error: "No spreadsheet ID provided" };
    }

    const sheets = getSheetsClient();
    const cleanSheet = sheetName.replace(/!.*$/, "");
    const range = `${cleanSheet}!A:F`;

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });

    return {
      ok: true,
      updatedRange: res.data.updates?.updatedRange ?? undefined,
    };
  } catch (err: any) {
    console.error("[sheets.ts] appendSheetRow error:", err);
    return {
      ok: false,
      error: err.message || "Failed to append row to Google Sheet",
    };
  }
}

/**
 * Quick connectivity check — reads a single cell to verify access.
 */
export async function testSheetAccess(
  spreadsheetId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const id =
      spreadsheetId ||
      process.env.ROUTINE_SHEET_ID ||
      process.env.ROUTINE_SPREADSHEET_ID;
    await readSheet(id, "A1:A1");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
