import express from "express"
import dotenv from 'dotenv'
import bodyParser from "body-parser"
import cors from "cors"
import memberRoute from "./routes/memberRoute.js"
import productRoute from "./routes/productRoute.js"
import cookieParser from "cookie-parser"
import cartRoute from "./routes/cartRoute.js"
import chatRoute from "./routes/chatRoute.js"
// import ส่วนที่ติดตั้งเข้ามา
import swaggerUI from "swagger-ui-express"
import yaml from "yaml"
// ใช้ File
import fs from "fs"
import path from "path"                          // ← เพิ่ม
import { fileURLToPath } from "url"  
dotenv.config()

const __filename = fileURLToPath(import.meta.url)  // ← เพิ่ม
const __dirname = path.dirname(__filename)          // ← เพิ่ม


const app =express()
const port = process.env.PORT || 3000
// swagger
const swaggerfile = fs.readFileSync('services/swagger.yaml','utf-8')
const swaggerDoc = yaml.parse(swaggerfile)
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map(origin => origin.trim()).filter(Boolean)
app.use((req, _res, next) => {
    console.log(`[http] ${req.method} ${req.path}`)
    next()
})
app.use(cors({
    origin: allowedOrigins,
    methods:['GET','POST','PUT','DELETE'], //Method ที่อนุญาต
    credentials:true  //ให้ส่งข้อมูล Header+Cookie ได้
}))

app.use(bodyParser.json())
app.use(cookieParser());
app.use("/img_pd", express.static(path.join(__dirname, "img_pd")))   // ← เปลี่ยน
app.use("/img_mem", express.static(path.join(__dirname, "img_mem"))) 
app.use(productRoute)
app.use(memberRoute)
app.use(cartRoute)
app.use(chatRoute)
// กำหนด path ที่จะให้เรียกหน้า Document ขึ้นมา
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDoc))
app.get("/__debug/backend", (_req, res) => {
    res.json({ backend: "web-ecommerce-supabase", pid: process.pid })
})
app.get('/',(req,res)=>{
    console.log(`GET / is Requestd.`)
    res.status(200).json({
        message:"ok"
    })
})
app.use((err, req, res, next) => {
    console.error(`[http-error] ${req.method} ${req.path}:`, err)
    if (res.headersSent) return next(err)
    const status = Number.isInteger(err.status) ? err.status : 500
    res.status(status).json({
        message: err.type === 'entity.parse.failed'
            ? 'รูปแบบข้อมูลคำขอไม่ถูกต้อง กรุณาลองใหม่'
            : 'เกิดข้อผิดพลาดใน backend',
    })
}) 

const server = app.listen(port,()=>{
    console.log(`Server is listen on Port ${port}`)
})
// Keep the HTTP listener referenced so Node remains alive while serving requests.
server.ref()
const processKeepAlive = setInterval(() => {}, 60_000)
server.once("close", () => clearInterval(processKeepAlive))
