import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const api = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')
const welcome = { role: 'assistant', content: 'สวัสดีค่ะ 😊 อยากให้ช่วยแนะนำสินค้าหรือตอบคำถามเกี่ยวกับร้านไหมคะ' }

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([welcome])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)
  const submittingRef = useRef(false)

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading, open])

  async function send(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || submittingRef.current) return
    submittingRef.current = true
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setDraft('')
    setError('')
    setLoading(true)
    try {
      const response = await axios.post(`${api}/chat`, { messages: next.slice(1) })
      setMessages([...next, { role: 'assistant', content: response.data.answer }])
    } catch (err) {
      const status = err.response?.status
      const serverMessage = typeof err.response?.data === 'string'
        ? ''
        : err.response?.data?.message
      const detail = serverMessage || (status === 404
        ? 'backend ปลายทางยังไม่มี API แชต /chat กรุณาอัปเดตและรีสตาร์ท backend'
        : status
          ? `backend ตอบกลับ HTTP ${status}`
          : 'เชื่อมต่อ backend ไม่ได้ ตรวจสอบว่า backend ทำงานและตั้งค่า VITE_PROXY_TARGET ถูกต้อง')
      setError(detail)
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return <>
    {open && <section className="shop-chat" aria-label="แชตผู้ช่วยร้านค้า">
      <header className="shop-chat-header"><span className="chat-avatar">KU</span><span><strong>ผู้ช่วย I HAVE KU</strong><small>ถามเรื่องสินค้าได้เลย</small></span><button type="button" className="chat-close" aria-label="ปิดแชต" onClick={() => setOpen(false)}>×</button></header>
      <div className="shop-chat-messages" ref={listRef} aria-live="polite">
        {messages.map((message, index) => <div className={`chat-message chat-${message.role}`} key={`${index}-${message.role}`}><p>{message.content}</p></div>)}
        {loading && <div className="chat-message chat-assistant"><p className="chat-typing">กำลังพิมพ์…</p></div>}
        {error && <p className="chat-error">{error}</p>}
      </div>
      <form className="shop-chat-form" onSubmit={send}><input aria-label="ข้อความ" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="พิมพ์ข้อความ..." maxLength={2000} disabled={loading} /><button type="submit" aria-label="ส่งข้อความ" disabled={loading || !draft.trim()}>ส่ง</button></form>
    </section>}
    <button type="button" className={`chat-launcher${open ? ' is-open' : ''}`} aria-label={open ? 'ปิดแชต' : 'เปิดแชตผู้ช่วย'} onClick={() => setOpen(!open)}>{open ? '×' : <><span aria-hidden="true">✦</span><span className="chat-launcher-label">แชตกับเรา</span></>}</button>
  </>
}
