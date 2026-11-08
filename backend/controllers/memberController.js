import database from "../services/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";

const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "lax" });

export async function postMember(req, res) {
  const { memEmail, memName, password } = req.body;
  if (!memEmail || !memName || !password) return res.status(422).json({ message: "กรุณากรอกอีเมล ชื่อ และรหัสผ่าน", regist: false });
  try {
    const [found] = await database.execute("SELECT memEmail FROM `Member` WHERE memEmail=?", [memEmail]);
    if (found.length) return res.status(409).json({ message: "อีเมลนี้ลงทะเบียนแล้ว", regist: false });
    const memHash = await bcrypt.hash(password, 11);
    await database.execute("INSERT INTO `Member` (memEmail, memName, memHash, role) VALUES (?, ?, ?, 'user')", [memEmail, memName, memHash]);
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ", regist: true });
  } catch (err) { res.status(500).json({ message: err.message, regist: false }); }
}

export async function loginMember(req, res) {
  try {
    console.info("[loginMember] Request received");
    const { loginName, password } = req.body || {};
    if (!loginName || !password) return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน", login: false });
    const [rows] = await database.execute("SELECT memEmail, memName, dutyId, memHash, role FROM `Member` WHERE memEmail=?", [loginName]);
    const storedHash = rows[0]?.memHash;
    if (!storedHash?.startsWith("$2") || !(await bcrypt.compare(password, storedHash))) return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", login: false });
    const member = rows[0];
    const token = jwt.sign({ memEmail: member.memEmail, memName: member.memName, dutyId: member.dutyId, role: member.role || "user" }, process.env.SECRET_KEY, { expiresIn: "1h" });
    res.cookie("token", token, { ...cookieOptions(), maxAge: 3600000 });
    res.json({ message: "เข้าสู่ระบบสำเร็จ", login: true, role: member.role || "user" });
  } catch (err) {
    console.error("[loginMember] Login failed:", err);
    const connectionError = ["EACCES", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "SELF_SIGNED_CERT_IN_CHAIN"]
      .includes(err.code) || err.name === "AggregateError";
    res.status(connectionError ? 503 : 500).json({
      message: connectionError
        ? "backend เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจ DATABASE_URL และการเชื่อมต่อ Supabase"
        : (err.message || "เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ"),
      login: false,
    });
  }
}

export function logoutMember(_req, res) { res.clearCookie("token", cookieOptions()).json({ message: "Logout Success", login: false }); }

export function getMember(req, res) {
  res.json({ memEmail: req.user.memEmail, memName: req.user.memName, dutyId: req.user.dutyId, role: req.user.role, login: true });
}

export async function getAllMembers(_req, res) {
  try {
    const [members] = await database.query("SELECT memEmail, memName, dutyId, role FROM `Member` ORDER BY memEmail");
    res.json({ message: "Success", members, count: members.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function deleteMember(req, res) {
  const conn = await database.getConnection();
  try {
    await conn.beginTransaction();
    const [carts] = await conn.execute("SELECT cartId FROM `Cart` WHERE cusId=?", [req.params.email]);
    for (const { cartId } of carts) await conn.execute("DELETE FROM `CartDtl` WHERE cartId=?", [cartId]);
    await conn.execute("DELETE FROM `Cart` WHERE cusId=?", [req.params.email]);
    const [result] = await conn.execute("DELETE FROM `Member` WHERE memEmail=?", [req.params.email]);
    await conn.commit();
    res.json({ success: result.affectedRows > 0, message: result.affectedRows ? "ลบสมาชิกแล้ว" : "ไม่พบสมาชิก" });
  } catch (err) { await conn.rollback(); res.status(500).json({ success: false, message: err.message }); }
  finally { conn.release(); }
}

export async function updateMemberRole(req, res) {
  const { role } = req.body;
  if (!['admin', 'user'].includes(role)) return res.status(400).json({ success: false, message: "สิทธิ์ไม่ถูกต้อง" });
  try {
    const [result] = await database.execute("UPDATE `Member` SET role=? WHERE memEmail=?", [role, req.params.email]);
    res.json({ success: result.affectedRows > 0, message: result.affectedRows ? "อัปเดตสิทธิ์แล้ว" : "ไม่พบสมาชิก" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

const memberUpload = multer({ storage: multer.diskStorage({ destination: "img_mem", filename: (req, _file, cb) => cb(null, `${req.body.memEmail}.jpg`) }) }).single("file");
export function uploadMember(req, res) { memberUpload(req, res, err => err ? res.status(400).json({ message: err.message }) : res.json({ message: "File uploaded successfully!" })); }

export async function getMemberOrders(req, res) {
  try {
    const [orders] = await database.execute(
      "SELECT d.cartId AS orderId, d.pdId AS productId, p.pdName AS productName, d.qty AS quantity, d.price, d.qty*d.price AS totalPrice, c.cusId AS memEmail, c.cartDate AS orderDate, CASE WHEN c.cartCf=1 THEN 'ยืนยันแล้ว' ELSE 'รอดำเนินการ' END AS status FROM `CartDtl` d JOIN `Cart` c ON d.cartId=c.cartId LEFT JOIN `Product` p ON d.pdId=p.pdId WHERE c.cusId=? ORDER BY d.cartId DESC",
      [req.params.email],
    );
    res.json({ message: "Success", orders, count: orders.length });
  } catch (err) { res.status(500).json({ message: err.message, orders: [], count: 0 }); }
}

