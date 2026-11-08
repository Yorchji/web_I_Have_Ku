import database from "../services/database.js";
import multer from "multer";
import fs from "fs/promises";
import path from "path";

const productSelect = `SELECT p.*, b.brandName, t.pdTypeName
  FROM \`Product\` p
  LEFT JOIN \`Brand\` b ON b.brandId = p.brandId
  LEFT JOIN \`ProductType\` t ON t.pdTypeId = p.pdTypeId`;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "img_pd"),
  filename: (req, _file, cb) => cb(null, `${req.body.pdId}.jpg`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
}).single("file");

export function uploadProductImage(req, res) {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message, success: false });
    if (!req.file) return res.status(400).json({ message: "ไม่พบไฟล์ภาพ", success: false });
    return res.json({ message: "อัปโหลดรูปสินค้าสำเร็จ", filename: req.file.filename, success: true });
  });
}

export async function getAllProduct(_req, res) {
  try {
    const [rows] = await database.query(`${productSelect} ORDER BY p.pdId`);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getProductById(req, res) {
  try {
    const [rows] = await database.execute(`${productSelect} WHERE p.pdId = ?`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getSerchProduct(req, res) {
  try {
    const term = `%${req.params.id}%`;
    const [rows] = await database.execute(`${productSelect} WHERE p.pdId LIKE ? OR p.pdName LIKE ? OR p.pdRemark LIKE ?`, [term, term, term]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getProductByBrandId(req, res) {
  try {
    const [rows] = await database.execute(`${productSelect} WHERE p.brandId = ?`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}

async function getByType(typeId, res) {
  try {
    const [rows] = await database.execute(`${productSelect} WHERE p.pdTypeId = ? ORDER BY p.pdId`, [typeId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
}
export const getAccessoryProduct = (_req, res) => getByType("T01", res);
export const getAggieShirtProduct = (_req, res) => getByType("T02", res);
export const getKuGenShirtProduct = (_req, res) => getByType("T03", res);
export const getKuNisitProduct = (_req, res) => getByType("T04", res);
export const getKUshoesProduct = (_req, res) => getByType("T05", res);
export const getTShirtProduct = (_req, res) => getByType("T06", res);

export async function postProduct(req, res) {
  const { pdId, pdName, pdPrice, pdRemark, pdTypeId, brandId } = req.body;
  if (!pdId || !pdName) return res.status(422).json({ message: "กรุณาระบุรหัสและชื่อสินค้า" });
  try {
    await database.execute(
      "INSERT INTO `Product` (pdId, pdName, pdPrice, pdRemark, pdTypeId, brandId) VALUES (?, ?, ?, ?, ?, ?)",
      [pdId, pdName, pdPrice ?? null, pdRemark ?? null, pdTypeId ?? null, brandId ?? null],
    );
    res.status(201).json({ pdId, pdName, pdPrice, pdRemark, pdTypeId, brandId, message: "ok" });
  } catch (err) {
    res.status(err.code === "ER_DUP_ENTRY" ? 409 : 500).json({ message: err.code === "ER_DUP_ENTRY" ? "รหัสสินค้านี้มีอยู่แล้ว" : err.message });
  }
}

export async function putProduct(req, res) {
  const { pdName, pdPrice, pdRemark, pdTypeId, brandId } = req.body;
  try {
    const [result] = await database.execute(
      "UPDATE `Product` SET pdName=?, pdPrice=?, pdRemark=?, pdTypeId=?, brandId=? WHERE pdId=?",
      [pdName, pdPrice, pdRemark, pdTypeId, brandId, req.params.id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json({ ...req.body, pdId: req.params.id, message: "ok" });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function deleteProduct(req, res) {
  try {
    const [result] = await database.execute("DELETE FROM `Product` WHERE pdId=?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "ไม่พบสินค้า" });
    try { await fs.unlink(path.join(process.cwd(), "img_pd", `${req.params.id}.jpg`)); } catch { /* รูปอาจไม่มี */ }
    res.status(204).end();
  } catch (err) { res.status(500).json({ message: err.message }); }
}

