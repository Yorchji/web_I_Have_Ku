import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore.js'

axios.defaults.withCredentials = true
const api = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_API_URL ?? '')
  : (import.meta.env.VITE_API_URL ?? '')
const image = (product) => `${api}/img_pd/${product?.pdId}.jpg`
const money = (value) => Number(value || 0).toLocaleString('th-TH')

function ProductGrid() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${api}/products`, { withCredentials: false })
      .then((response) => setItems(Array.isArray(response.data) ? response.data : response.data.products || []))
      .catch((err) => setError(`โหลดสินค้าไม่สำเร็จ (${api}/products): ${err.response?.status || err.message}`))
  }, [])

  return (
    <main className="page-container">
      <section className="store-hero">
        <div>
          <span className="eyebrow">I HAVE KU · EVERYDAY ESSENTIALS</span>
          <h1>เลือกของชิ้นโปรด</h1>
          <p>สินค้าคุณภาพดี คัดสรรมาเพื่อคุณ</p>
        </div>
        <Link className="hero-link" to="/cartList">ดูตะกร้าของฉัน <span aria-hidden="true">→</span></Link>
      </section>
      <section className="section-heading">
        <div><span className="eyebrow">OUR COLLECTION</span><h2>สินค้าทั้งหมด</h2></div>
        <span className="item-count">{items.length} รายการ</span>
      </section>
      {error && <div className="notice notice-warning">{error}</div>}
      {!error && !items.length && <div className="empty-state"><span className="empty-icon">◇</span><h3>กำลังโหลดสินค้า</h3><p>กรุณารอสักครู่</p></div>}
      <div className="product-grid">
        {items.map((product) => (
          <article className="product-card" key={product.pdId}>
            <Link className="product-image" to={`/ProductShow/${product.pdId}`} aria-label={`ดูสินค้า ${product.pdName}`}>
              <img src={image(product)} alt={product.pdName} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement.classList.add('image-missing') }} />
              <span className="image-placeholder">I HAVE KU</span>
            </Link>
            <div className="product-info">
              <h3>{product.pdName}</h3>
              <div className="product-bottom"><strong>{money(product.pdPrice)} <small>฿</small></strong><Link className="button button-small" to={`/ProductShow/${product.pdId}`}>ดูสินค้า <span aria-hidden="true">→</span></Link></div>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}

export function MainMenu() {
  const [member, setMember] = useState(null)
  const nav = useNavigate()
  useEffect(() => { axios.get(`${api}/members/detail`).then((response) => setMember(response.data)).catch(() => setMember(null)) }, [])
  async function logout() {
    try { await axios.get(`${api}/members/logout`) } finally { setMember(null); nav('/') }
  }

  return (
    <header className="site-header"><nav className="site-nav">
      <Link className="brand" to="/"><span className="brand-mark">K</span><span>I HAVE KU<small>CURATED GOODS</small></span></Link>
      <div className="nav-links"><Link to="/">สินค้า</Link><Link to="/cartList">ตะกร้าของฉัน</Link>{member?.role === 'admin' && <><Link to="/admin/members">สมาชิก</Link><Link to="/admin/addproducts">เพิ่มสินค้า</Link><Link to="/admin/editproducts">แก้ไขสินค้า</Link></>}</div>
      <div className="nav-account">{member ? <><Link className="member-name" to="/pagemember">{member.memName || member.memEmail}</Link><button className="button button-outline" onClick={logout}>ออกจากระบบ</button></> : <><Link to="/login">เข้าสู่ระบบ</Link><Link className="button button-outline" to="/register">สมัครสมาชิก</Link></>}</div>
    </nav></header>
  )
}

export function TheProduct() { return <ProductGrid /> }

export function TheLogin() {
  const nav = useNavigate()
  const [form, set] = useState({ loginName: '', password: '' })
  const [msg, sm] = useState('')
  async function submit(event) {
    event.preventDefault()
    try {
      const response = await axios.post(`${api}/members/login`, form)
      sm(response.data.message || 'เข้าสู่ระบบสำเร็จ')
      if (response.data.login) { nav('/'); window.location.reload() }
    } catch (err) { sm(err.response?.data?.message || 'เข้าสู่ระบบไม่สำเร็จ') }
  }
  return <main className="auth-page"><form className="form-card" onSubmit={submit}><span className="eyebrow">ยินดีต้อนรับกลับ</span><h1>เข้าสู่ระบบ</h1><p className="form-intro">เข้าสู่ระบบเพื่อเลือกซื้อสินค้าและติดตามตะกร้าของคุณ</p>{msg && <div className="notice notice-info">{msg}</div>}<label htmlFor="login-email">อีเมล</label><input id="login-email" className="field" type="email" autoComplete="username" value={form.loginName} onChange={(event) => set({ ...form, loginName: event.target.value })} required /><label htmlFor="login-password">รหัสผ่าน</label><input id="login-password" className="field" type="password" autoComplete="current-password" value={form.password} onChange={(event) => set({ ...form, password: event.target.value })} required /><button className="button button-wide">เข้าสู่ระบบ</button><p className="form-footer">ยังไม่มีบัญชี? <Link to="/register">ลงทะเบียน</Link></p></form></main>
}

export function TheRegister() {
  const [form, set] = useState({ memEmail: '', memName: '', password: '' })
  const [msg, sm] = useState('')
  async function submit(event) { event.preventDefault(); try { const response = await axios.post(`${api}/members`, form); sm(response.data.message || 'ลงทะเบียนสำเร็จ') } catch (err) { sm(err.response?.data?.message || 'ลงทะเบียนไม่สำเร็จ') } }
  return <main className="auth-page"><form className="form-card" onSubmit={submit}><span className="eyebrow">JOIN I HAVE KU</span><h1>สมัครสมาชิก</h1><p className="form-intro">สร้างบัญชีเพื่อเริ่มเลือกซื้อสินค้าชิ้นโปรด</p>{msg && <div className="notice notice-info">{msg}</div>}{[['memEmail', 'อีเมล', 'email'], ['memName', 'ชื่อ-นามสกุล', 'text'], ['password', 'รหัสผ่าน', 'password']].map(([key, label, type]) => <React.Fragment key={key}><label htmlFor={`register-${key}`}>{label}</label><input id={`register-${key}`} className="field" type={type} autoComplete={key === 'password' ? 'new-password' : key === 'memEmail' ? 'email' : 'name'} required value={form[key]} onChange={(event) => set({ ...form, [key]: event.target.value })} /></React.Fragment>)}<button className="button button-wide">สร้างบัญชี</button><p className="form-footer">มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p></form></main>
}

export function ProductShow() {
  const { pdId } = useParams()
  const [product, setProduct] = useState(null)
  const cart = useCartStore()
  useEffect(() => { axios.get(`${api}/products/${pdId}`, { withCredentials: false }).then((response) => setProduct(Array.isArray(response.data) ? response.data[0] : response.data)).catch(() => setProduct(null)) }, [pdId])
  async function add() {
    try {
      const member = await axios.get(`${api}/members/detail`)
      const cartResponse = await axios.post(`${api}/carts/chkcart`, { memEmail: member.data.memEmail })
      let id = cartResponse.data.cartId
      if (!id) { const created = await axios.post(`${api}/carts/addcart`, { cusId: member.data.memEmail }); id = created.data.messageAddCart }
      const added = await axios.post(`${api}/carts/addcartdtl`, { cartId: id, pdId, pdPrice: product.pdPrice })
      if (!added.data.cartDtlOK) throw new Error('Could not add product')
      cart.setId(id); cart.updateQty(); window.alert('เพิ่มสินค้าในตะกร้าแล้ว')
    } catch { window.alert('กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้า') }
  }
  if (!product) return <main className="page-container"><div className="empty-state"><h2>ไม่พบสินค้า</h2><Link to="/">กลับไปเลือกสินค้า</Link></div></main>
  return <main className="page-container"><div className="detail-card"><div className="detail-image"><img src={image(product)} alt={product.pdName} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement.classList.add('image-missing') }} /><span className="image-placeholder">I HAVE KU</span></div><div className="detail-info"><span className="eyebrow">PRODUCT DETAILS</span><h1>{product.pdName}</h1><p>{product.pdRemark || 'สินค้าคุณภาพดี คัดสรรมาเพื่อคุณ'}</p><strong className="detail-price">{money(product.pdPrice)} <small>฿</small></strong><button className="button" onClick={add}>เพิ่มลงตะกร้า <span aria-hidden="true">→</span></button><Link className="back-link" to="/">← กลับไปดูสินค้าทั้งหมด</Link></div></div></main>
}

export function CartShow() { const { cartId } = useParams(); return <CartPage id={cartId} /> }

export function CartPage({ id }) {
  const [rows, setRows] = useState([])
  useEffect(() => { if (id) axios.get(`${api}/carts/getcartdtl/${id}`).then((response) => setRows(Array.isArray(response.data) ? response.data : [])).catch(() => setRows([])) }, [id])
  const quantity = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0)
  const total = rows.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.pdPrice || 0), 0)
  return <main className="page-container"><section className="section-heading"><div><span className="eyebrow">YOUR SELECTION</span><h1>ตะกร้าสินค้า</h1></div>{id && <span className="status-pill">ตะกร้า #{id}</span>}</section>{rows.length ? <div className="cart-layout"><div className="cart-items">{rows.map((row, index) => <article className="cart-item" key={`${row.pdId}-${index}`}><div className="cart-thumb"><img src={image(row)} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement.classList.add('image-missing') }} /><span className="image-placeholder">KU</span></div><div className="cart-item-info"><h3>{row.pdName || row.pdId}</h3><p>จำนวน {row.qty || 0} ชิ้น</p></div><strong>{money(Number(row.qty || 0) * Number(row.pdPrice || 0))} ฿</strong></article>)}</div><aside className="order-summary"><h2>สรุปรายการ</h2><div><span>จำนวนสินค้า</span><span>{quantity} ชิ้น</span></div><div className="summary-total"><span>ยอดรวม</span><strong>{money(total)} ฿</strong></div><Link className="button button-wide" to="/">เลือกซื้อสินค้าต่อ</Link></aside></div> : <div className="empty-state"><span className="empty-icon">◇</span><h2>ตะกร้านี้ยังว่างอยู่</h2><p>เลือกสินค้าที่ถูกใจแล้วกลับมาที่นี่ได้เลย</p><Link className="button" to="/">เลือกดูสินค้า</Link></div>}</main>
}

export function CartList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { axios.get(`${api}/members/detail`).then((member) => axios.post(`${api}/carts/getcartbycus`, { id: member.data.memEmail })).then((response) => setRows(Array.isArray(response.data) ? response.data : [])).catch((err) => setError(err.response?.status === 401 ? 'กรุณาเข้าสู่ระบบเพื่อดูตะกร้าของคุณ' : 'โหลดรายการตะกร้าไม่สำเร็จ')).finally(() => setLoading(false)) }, [])
  return <main className="page-container"><section className="section-heading"><div><span className="eyebrow">YOUR SHOPPING HISTORY</span><h1>รายการตะกร้าสินค้า</h1><p className="section-subtitle">เลือกตะกร้าเพื่อดูรายละเอียดสินค้า</p></div><Link className="button button-outline" to="/">เลือกซื้อสินค้า</Link></section>{error && <div className="notice notice-warning">{error} <Link to="/login">เข้าสู่ระบบ</Link></div>}{loading ? <div className="empty-state"><p>กำลังโหลดรายการตะกร้า...</p></div> : rows.length ? <div className="cart-list">{rows.map((row, index) => <Link className="cart-list-card" to={`/cartShow/${row.cartId}`} key={`${row.cartId}-${index}`}><span className="cart-icon">▤</span><span className="cart-list-info"><strong>ตะกร้า #{row.cartId}</strong><small>{row.cartCf ? 'ยืนยันรายการแล้ว' : 'กำลังเลือกสินค้า'}</small></span><span className="cart-qty">{row.sqty || 0}<small>รายการ</small></span><span className="cart-arrow" aria-hidden="true">→</span></Link>)}</div> : !error && <div className="empty-state"><span className="empty-icon">◇</span><h2>ยังไม่มีตะกร้าสินค้า</h2><p>สินค้าที่คุณเพิ่มไว้จะแสดงอยู่ที่หน้านี้</p><Link className="button" to="/">เริ่มเลือกสินค้า</Link></div>}</main>
}

export function PageMember() {
  const [member, setMember] = useState(null)
  useEffect(() => { axios.get(`${api}/members/detail`).then((response) => setMember(response.data)).catch(() => setMember(null)) }, [])
  return <main className="page-container"><section className="section-heading"><div><span className="eyebrow">ACCOUNT</span><h1>ข้อมูลสมาชิก</h1></div></section>{member ? <section className="profile-card"><div className="avatar">{(member.memName || member.memEmail || 'K').slice(0, 1).toUpperCase()}</div><div><h2>{member.memName || 'สมาชิก I HAVE KU'}</h2><p>{member.memEmail}</p></div><span className="status-pill">สมาชิก</span></section> : <div className="empty-state"><p>กรุณาเข้าสู่ระบบเพื่อดูข้อมูลสมาชิก</p><Link className="button" to="/login">เข้าสู่ระบบ</Link></div>}</main>
}

export function ListMemberShow() {
  const [items, setItems] = useState([])
  useEffect(() => { axios.get(`${api}/members/all`).then((response) => setItems(Array.isArray(response.data) ? response.data : response.data.members || [])).catch(() => setItems([])) }, [])
  return <main className="page-container"><section className="section-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>สมาชิก</h1></div><span className="item-count">{items.length} คน</span></section><div className="data-card table-responsive"><table className="data-table"><thead><tr><th>อีเมล</th><th>ชื่อ</th><th>สิทธิ์</th></tr></thead><tbody>{items.map((member, index) => <tr key={member.memEmail || index}><td>{member.memEmail}</td><td>{member.memName}</td><td><span className="status-pill">{member.role}</span></td></tr>)}</tbody></table></div></main>
}

export function AddProduct() {
  const [form, set] = useState({ pdId: '', pdName: '', pdPrice: '', pdRemark: '', pdTypeId: '', brandId: '' })
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  async function submit(event) { event.preventDefault(); try { await axios.post(`${api}/products`, form); if (file) { const data = new FormData(); data.append('pdId', form.pdId); data.append('file', file); await axios.post(`${api}/products/uploadimg`, data) } setMsg('เพิ่มสินค้าสำเร็จ') } catch (err) { setMsg(err.response?.data?.message || 'เพิ่มสินค้าไม่สำเร็จ') } }
  return <main className="page-container form-page"><form className="form-card form-card-wide" onSubmit={submit}><span className="eyebrow">ADMINISTRATION</span><h1>เพิ่มสินค้าใหม่</h1>{msg && <div className="notice notice-info">{msg}</div>}{[['pdId', 'รหัสสินค้า'], ['pdName', 'ชื่อสินค้า'], ['pdPrice', 'ราคา'], ['pdTypeId', 'รหัสประเภทสินค้า'], ['brandId', 'รหัสแบรนด์']].map(([key, label]) => <React.Fragment key={key}><label htmlFor={`product-${key}`}>{label}</label><input id={`product-${key}`} className="field" required value={form[key]} onChange={(event) => set({ ...form, [key]: event.target.value })} /></React.Fragment>)}<label htmlFor="product-remark">รายละเอียด</label><textarea id="product-remark" className="field" rows="4" value={form.pdRemark} onChange={(event) => set({ ...form, pdRemark: event.target.value })} /><label htmlFor="product-image">รูปสินค้า</label><input id="product-image" type="file" accept="image/*" className="field" onChange={(event) => setFile(event.target.files[0])} /><button className="button">บันทึกสินค้า</button></form></main>
}
