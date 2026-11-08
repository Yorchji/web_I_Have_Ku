import database from "../services/database.js";

export async function chkCart(req, res) {
  if (!req.body.memEmail) return res.json({ error: true, errormessage: "member Email is required" });
  try {
    const [rows] = await database.execute("SELECT cartId FROM `Cart` WHERE cusId=? AND (cartCf=0 OR cartCf IS NULL) LIMIT 1", [req.body.memEmail]);
    res.json(rows.length ? { cartExist: true, cartId: rows[0].cartId } : { cartExist: false });
  } catch (err) { res.status(500).json({ error: true, message: err.message }); }
}

export async function postCart(req, res) {
  if (!req.body.cusId) return res.json({ cartOK: false, messageAddCart: "Customer Id is required" });
  try {
    const cartId = `${new Date().toISOString().slice(0, 10).replaceAll("-", "")}${Date.now().toString().slice(-6)}`;
    await database.execute("INSERT INTO `Cart` (cartId, cusId, cartDate, cartCf) VALUES (?, ?, CURDATE(), 0)", [cartId, req.body.cusId]);
    res.json({ cartOK: true, messageAddCart: cartId, cartId });
  } catch (err) { res.status(500).json({ cartOK: false, messageAddCart: err.message }); }
}

export async function postCartDtl(req, res) {
  const { cartId, pdId, pdPrice } = req.body;
  if (!cartId || !pdId || pdPrice == null) return res.json({ cartDtlOK: false, messageAddCartDtl: "cartId, pdId และ pdPrice จำเป็นต้องมีค่า" });
  try {
    await database.execute(
      "INSERT INTO `CartDtl` (cartId, pdId, qty, price) VALUES (?, ?, 1, ?) ON DUPLICATE KEY UPDATE qty=qty+1",
      [cartId, pdId, pdPrice],
    );
    res.json({ cartDtlOK: true, messageAddCart: cartId });
  } catch (err) { res.status(500).json({ cartDtlOK: false, messageAddCartDtl: err.message }); }
}

export async function sumCart(req, res) {
  try {
    const [[row]] = await database.execute("SELECT SUM(qty) AS qty, SUM(qty*price) AS money FROM `CartDtl` WHERE cartId=?", [req.params.id]);
    res.json({ id: req.params.id, qty: row.qty ?? 0, money: row.money ?? 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getCart(req, res) {
  try {
    const [rows] = await database.execute("SELECT c.*, SUM(d.qty) AS sqty, SUM(d.price*d.qty) AS sprice FROM `Cart` c LEFT JOIN `CartDtl` d ON c.cartId=d.cartId WHERE c.cartId=? GROUP BY c.cartId", [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function getCartDtl(req, res) {
  try {
    // CartDtl stores the price as `price`; expose it as `pdPrice` to match the
    // product price field consumed by the cart UI.
    const [rows] = await database.execute("SELECT d.pdId, p.pdName, d.qty, d.price AS pdPrice FROM `CartDtl` d LEFT JOIN `Product` p ON d.pdId=p.pdId WHERE d.cartId=? ORDER BY d.pdId", [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function getCartByCus(req, res) {
  try {
    const [rows] = await database.execute("SELECT c.*, SUM(d.qty) AS sqty, SUM(d.price*d.qty) AS sprice FROM `Cart` c LEFT JOIN `CartDtl` d ON c.cartId=d.cartId WHERE c.cusId=? GROUP BY c.cartId ORDER BY c.cartId DESC", [req.body.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function delCartDtl(req, res) {
  const { cartId, pdId } = req.body;
  try {
    const [rows] = await database.execute("SELECT qty FROM `CartDtl` WHERE cartId=? AND pdId=?", [cartId, pdId]);
    if (!rows.length) return res.json({ cartDtlOK: false, messageDelCartDtl: "ไม่พบสินค้าในตะกร้า" });
    if (rows[0].qty > 1) await database.execute("UPDATE `CartDtl` SET qty=qty-1 WHERE cartId=? AND pdId=?", [cartId, pdId]);
    else await database.execute("DELETE FROM `CartDtl` WHERE cartId=? AND pdId=?", [cartId, pdId]);
    res.json({ cartDtlOK: true, messageDelCartDtl: "ปรับจำนวนสินค้าแล้ว" });
  } catch (err) { res.status(500).json({ cartDtlOK: false, messageDelCartDtl: err.message }); }
}

export async function delCart(req, res) {
  const { cartId } = req.body;
  const conn = await database.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute("SELECT cartCf FROM `Cart` WHERE cartId=? FOR UPDATE", [cartId]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ cartOK: false, messageDelCart: "ไม่พบตะกร้า" }); }
    if (rows[0].cartCf) { await conn.rollback(); return res.status(403).json({ cartOK: false, messageDelCart: "ตะกร้ายืนยันแล้ว ลบไม่ได้" }); }
    await conn.execute("DELETE FROM `CartDtl` WHERE cartId=?", [cartId]);
    await conn.execute("DELETE FROM `Cart` WHERE cartId=?", [cartId]);
    await conn.commit();
    res.json({ cartOK: true, messageDelCart: "ลบตะกร้าแล้ว" });
  } catch (err) { await conn.rollback(); res.status(500).json({ cartOK: false, messageDelCart: err.message }); }
  finally { conn.release(); }
}

export async function confirmCart(req, res) {
  try {
    const [result] = await database.execute("UPDATE `Cart` SET cartCf=1 WHERE cartId=?", [req.body.cartId]);
    res.json({ cartOK: result.affectedRows > 0, messageConfirmCart: result.affectedRows ? "ยืนยันคำสั่งซื้อเรียบร้อย" : "ไม่พบตะกร้า" });
  } catch (err) { res.status(500).json({ cartOK: false, messageConfirmCart: err.message }); }
}
