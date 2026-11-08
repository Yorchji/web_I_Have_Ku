import React, { useEffect, useState } from 'react'
import axios from 'axios'

const api = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')

export default function EditProducts() {
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [imageFile, setImageFile] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadProducts() {
    try {
      const response = await axios.get(`${api}/products`, { withCredentials: false })
      setProducts(Array.isArray(response.data) ? response.data : response.data.products || [])
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'โหลดสินค้าไม่สำเร็จ')
    }
  }

  useEffect(() => { loadProducts() }, [])

  function startEdit(product) {
    setSelected(product)
    setForm({ pdName: product.pdName || '', pdPrice: product.pdPrice ?? '', pdRemark: product.pdRemark || '', pdTypeId: product.pdTypeId || '', brandId: product.brandId || '' })
    setImageFile(null)
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    try {
      await axios.put(`${api}/products/${selected.pdId}`, form)
      if (imageFile) {
        const data = new FormData()
        data.append('pdId', selected.pdId)
        data.append('file', imageFile)
        await axios.post(`${api}/products/uploadimg`, data)
      }
      setMessage(imageFile ? 'บันทึกข้อมูลและรูปภาพสินค้าแล้ว' : 'บันทึกการแก้ไขสินค้าแล้ว')
      setSelected(null)
      await loadProducts()
    } catch (err) {
      setMessage(err.response?.data?.message || 'บันทึกการแก้ไขไม่สำเร็จ กรุณาเข้าสู่ระบบแอดมิน')
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`ยืนยันลบสินค้า “${product.pdName}” (${product.pdId}) หรือไม่?`)) return
    try {
      await axios.delete(`${api}/products/${product.pdId}`)
      if (selected?.pdId === product.pdId) setSelected(null)
      setMessage(`ลบสินค้า ${product.pdName} แล้ว`)
      await loadProducts()
    } catch (err) {
      setMessage(err.response?.data?.message || 'ลบสินค้าไม่สำเร็จ กรุณาเข้าสู่ระบบแอดมิน')
    }
  }

  return <main className="page-container">
    <section className="section-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>แก้ไขสินค้า</h1><p className="section-subtitle">เลือกสินค้าเพื่อแก้ไขรายละเอียด</p></div><span className="item-count">{products.length} รายการ</span></section>
    {error && <div className="notice notice-warning">{error}</div>}
    {message && <div className="notice notice-info">{message}</div>}
    {selected && <form className="form-card form-card-wide edit-product-form" onSubmit={save}>
      <span className="eyebrow">รหัสสินค้า {selected.pdId}</span><h2>แก้ไข {selected.pdName}</h2>
      {[['pdName', 'ชื่อสินค้า'], ['pdPrice', 'ราคา'], ['pdTypeId', 'รหัสประเภทสินค้า'], ['brandId', 'รหัสแบรนด์']].map(([key, label]) => <React.Fragment key={key}><label htmlFor={`edit-${key}`}>{label}</label><input id={`edit-${key}`} className="field" type={key === 'pdPrice' ? 'number' : 'text'} min={key === 'pdPrice' ? '0' : undefined} step={key === 'pdPrice' ? '0.01' : undefined} required={key === 'pdName'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></React.Fragment>)}
      <label htmlFor="edit-pdRemark">รายละเอียด</label><textarea id="edit-pdRemark" className="field" rows="4" value={form.pdRemark} onChange={(event) => setForm({ ...form, pdRemark: event.target.value })} />
      <label htmlFor="edit-product-image">เปลี่ยนรูปสินค้า</label><input id="edit-product-image" className="field" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /><small className="image-edit-hint">เลือกไฟล์ภาพใหม่เพื่อแทนที่รูปเดิม (ไม่เกิน 5 MB)</small>
      <div className="edit-product-actions"><button className="button" type="submit">บันทึกการแก้ไข</button><button className="button button-outline" type="button" onClick={() => setSelected(null)}>ยกเลิก</button></div>
    </form>}
    <div className="data-card table-responsive"><table className="data-table"><thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>ราคา</th><th>จัดการ</th></tr></thead><tbody>{products.map((product) => <tr key={product.pdId}><td>{product.pdId}</td><td>{product.pdName}</td><td>{Number(product.pdPrice || 0).toLocaleString('th-TH')} ฿</td><td><div className="edit-product-actions"><button className="button button-small" type="button" onClick={() => startEdit(product)}>แก้ไข</button><button className="button button-small button-danger" type="button" onClick={() => removeProduct(product)}>ลบ</button></div></td></tr>)}</tbody></table></div>
  </main>
}
