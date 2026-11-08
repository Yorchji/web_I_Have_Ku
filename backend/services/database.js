import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: [path.join(backendDirectory, ".env.local"), path.join(backendDirectory, ".env")] });

const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase's pooled connection may present a chain not trusted by the
      // local Node.js certificate store. Keep TLS encryption enabled while
      // allowing that managed certificate chain.
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_SIZE || 10),
    })
  : null;

const camelCaseColumns = [
  "brandId", "brandName", "cartId", "cusId", "cartDate", "cartCf", "pdId",
  "pdName", "pdPrice", "pdRemark", "pdTypeId", "pdTypeName", "memEmail",
  "memName", "dutyId", "memHash", "orderId", "productId", "productName",
  "totalPrice", "orderDate",
];

const postgresTables = {
  Brand: "brands",
  ProductType: '"pdTypes"',
  Product: "products",
  Member: "members",
  Cart: "carts",
  CartDtl: '"cartDtl"',
};

function postgresSql(sql) {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let query = "";
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (char === "'" && !inDoubleQuote && !inBacktick) {
      if (inSingleQuote && sql[i + 1] === "'") { query += "''"; i += 1; continue; }
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    } else if (char === "?" && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      query += `$${++index}`;
      continue;
    }
    query += char;
  }
  query = query.replace(/`([^`]+)`/g, (_match, identifier) =>
    postgresTables[identifier] ?? `"${identifier}"`,
  );
  for (const column of camelCaseColumns) {
    query = query.replace(new RegExp(`(?<![\\w\"'])${column}(?![\\w\"'])`, "g"), `"${column}"`);
  }
  query = query.replace(/\bCURDATE\(\)/gi, "CURRENT_DATE");
  query = query.replace(
    /ON DUPLICATE KEY UPDATE\s+qty\s*=\s*qty\s*\+\s*1/gi,
    'ON CONFLICT ("cartId", "pdId") DO UPDATE SET qty = qty + 1',
  );
  return query;
}

function requirePool() {
  if (!pool) {
    const error = new Error("ตั้งค่า DATABASE_URL ใน backend/.env.local ก่อนเชื่อมต่อ Supabase");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }
  return pool;
}

function normalizeError(error) {
  if (error.code === "23505") error.code = "ER_DUP_ENTRY";
  return error;
}

function mysqlResult(result) {
  return { affectedRows: result.rowCount ?? 0, insertId: result.rows?.[0]?.id ?? null };
}

async function executeWith(client, sql, params = []) {
  try {
    const result = await client.query(postgresSql(sql), params);
    return result.command === "SELECT" || result.command === "SHOW"
      ? [result.rows, result]
      : [mysqlResult(result), result];
  } catch (error) {
    throw normalizeError(error);
  }
}

const database = {
  query(sql, params = []) {
    return executeWith(requirePool(), sql, params);
  },
  execute(sql, params = []) {
    return executeWith(requirePool(), sql, params);
  },
  async getConnection() {
    const client = await requirePool().connect();
    return {
      query: (sql, params = []) => executeWith(client, sql, params),
      execute: (sql, params = []) => executeWith(client, sql, params),
      beginTransaction: () => client.query("BEGIN"),
      commit: () => client.query("COMMIT"),
      rollback: () => client.query("ROLLBACK"),
      release: () => client.release(),
    };
  },
  end: () => pool?.end(),
};

export default database;
