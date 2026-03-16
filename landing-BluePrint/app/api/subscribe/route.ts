import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ─── Storage path ────────────────────────────────────────────
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "emails.json");

// ─── Types ───────────────────────────────────────────────────
interface EmailEntry {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  source: string;
  date: string;
  ip: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readEmails(): EmailEntry[] {
  ensureStorage();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as EmailEntry[];
}

function writeEmails(emails: EmailEntry[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2), "utf-8");
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── POST /api/subscribe ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, phone, company, source = "cta" } = body;

    // Validate
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
      return NextResponse.json(
        { error: "Некорректный email адрес" },
        { status: 400 }
      );
    }

    const emails = readEmails();

    // Duplicate check
    const exists = emails.find(
      (e) => e.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { message: "Этот email уже зарегистрирован", duplicate: true },
        { status: 200 }
      );
    }

    const entry: EmailEntry = {
      id: Date.now(),
      email: email.toLowerCase().trim(),
      name: name?.trim() || undefined,
      phone: phone?.trim() || undefined,
      company: company?.trim() || undefined,
      source,
      date: new Date().toISOString(),
      ip: getClientIp(req),
    };

    emails.push(entry);
    writeEmails(emails);

    console.log(`[subscribe] New lead: ${entry.email} (total: ${emails.length})`);

    return NextResponse.json(
      { message: "Заявка принята!", total: emails.length },
      { status: 201 }
    );
  } catch (err) {
    console.error("[subscribe] Error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

// ─── GET /api/subscribe  (protected admin view) ──────────────
// Usage: GET /api/subscribe  Header: Authorization: Bearer <ADMIN_TOKEN>
export async function GET(req: NextRequest) {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN не настроен в .env" },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 401 });
  }

  try {
    const emails = readEmails();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    // CSV export
    if (format === "csv") {
      const header = "id,email,name,phone,company,source,date,ip";
      const rows = emails.map(
        (e) =>
          `${e.id},"${e.email}","${e.name || ""}","${e.phone || ""}","${e.company || ""}","${e.source}","${e.date}","${e.ip}"`
      );
      const csv = [header, ...rows].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wms-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      total: emails.length,
      emails,
    });
  } catch (err) {
    console.error("[subscribe] Read error:", err);
    return NextResponse.json({ error: "Ошибка чтения данных" }, { status: 500 });
  }
}
