const express=require("express");
require("dotenv").config();
const path=require("path"), fs=require("fs"), crypto=require("crypto");
const multer=require("multer");
const Database=require("better-sqlite3");
const cookieParser=require("cookie-parser");

const app=express();
const PORT=process.env.PORT||3000;
const ROOT=__dirname;
const db=new Database(path.join(ROOT,"data","mh.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, description TEXT DEFAULT '', category TEXT NOT NULL,
 price INTEGER NOT NULL, old_price INTEGER DEFAULT 0, stock INTEGER DEFAULT 0,
 tag TEXT DEFAULT '', image TEXT DEFAULT '', active INTEGER DEFAULT 1,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_code TEXT UNIQUE NOT NULL,
 name TEXT NOT NULL, phone TEXT NOT NULL, governorate TEXT NOT NULL, address TEXT NOT NULL,
 items_json TEXT NOT NULL, total INTEGER NOT NULL, payment_method TEXT NOT NULL,
 receipt_image TEXT DEFAULT '', status TEXT DEFAULT 'بانتظار التحقق من الدفع',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const seed=db.prepare("SELECT COUNT(*) c FROM products").get().c;
if(!seed){
 const ins=db.prepare("INSERT INTO products(name,description,category,price,old_price,stock,tag,image) VALUES(?,?,?,?,?,?,?,?)");
 [
 ["Wi‑Fi 6 AX3000 Router","راوتر Wi‑Fi 6 سريع للاستخدام المنزلي والألعاب.","internet",85000,99000,12,"HOT",""],
 ["Mesh Wi‑Fi System","تغطية Wi‑Fi واسعة للبيت والمكتب.","internet",145000,165000,8,"جديد",""],
 ["FTTH ONU / ONT","جهاز ONT لشبكات الألياف الضوئية.","internet",38000,45000,20,"",""],
 ["Gaming Headset Pro","سماعة ألعاب بصوت محيطي وميكروفون.","gaming",45000,55000,14,"خصم",""],
 ["Mechanical Gaming Keyboard","كيبورد ميكانيكي بإضاءة RGB.","gaming",55000,65000,10,"خصم",""],
 ["RGB Gaming Mouse","ماوس Gaming بدقة عالية.","gaming",28000,35000,25,"HOT",""],
 ["4K Gaming Monitor","شاشة 4K للألعاب والمحتوى.","gaming",420000,465000,5,"عرض",""],
 ["Digital Streaming Membership","منتج رقمي حسب شروط المورّد.","digital",30000,40000,99,"رقمي",""],
 ["Sports App Annual","اشتراك سنوي رقمي مرخّص حسب المورّد.","digital",35000,45000,99,"سنوي",""]
 ].forEach(x=>ins.run(...x));
}

app.use(express.json({limit:"2mb"})); app.use(cookieParser());
app.use(express.static(path.join(ROOT,"public")));
fs.mkdirSync(path.join(ROOT,"uploads"),{recursive:true});
const storage=multer.diskStorage({
 destination:(req,file,cb)=>cb(null,path.join(ROOT,"uploads")),
 filename:(req,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase();cb(null,Date.now()+"-"+crypto.randomBytes(5).toString("hex")+ext)}
});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(r,f,cb)=>/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype)?cb(null,true):cb(new Error("Images only"))});

const ADMIN_USER=process.env.ADMIN_USER||"admin";
const ADMIN_PASS=process.env.ADMIN_PASS||"CHANGE-ME-NOW";
const sessions=new Map();
function auth(req,res,next){
 const sid=req.cookies.mh_admin; if(!sid||!sessions.has(sid))return res.status(401).json({error:"غير مصرح"});
 next();
}
function code(){return "MH-"+Date.now().toString().slice(-8)+"-"+crypto.randomBytes(2).toString("hex").toUpperCase()}
app.get("/health",(req,res)=>res.json({ok:true,service:"MH Store"}));
app.get("/api/products",(req,res)=>res.json(db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all()));
app.get("/api/products/:id",(req,res)=>{const p=db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(req.params.id);p?res.json(p):res.status(404).json({error:"المنتج غير موجود"})});
app.post("/api/orders",upload.single("receipt"),(req,res)=>{
 try{
  const {name,phone,governorate,address,payment_method,items,total}=req.body;
  if(!name||!phone||!governorate||!address||!payment_method||!items)return res.status(400).json({error:"بيانات الطلب ناقصة"});
  const parsed=JSON.parse(items); if(!Array.isArray(parsed)||!parsed.length)throw Error();
  let serverTotal=0;
  for(const it of parsed){
   const p=db.prepare("SELECT id,name,price,stock FROM products WHERE id=? AND active=1").get(it.id);
   if(!p||p.stock<Number(it.qty))return res.status(400).json({error:`المنتج غير متوفر: ${p?.name||it.id}`});
   serverTotal+=p.price*Number(it.qty);
  }
  const receipt=req.file?"/uploads/"+req.file.filename:"";
  const code=code();
  db.prepare(`INSERT INTO orders(order_code,name,phone,governorate,address,items_json,total,payment_method,receipt_image)
              VALUES(?,?,?,?,?,?,?,?,?)`).run(code,name,phone,governorate,address,JSON.stringify(parsed),serverTotal,payment_method,receipt);
  res.json({ok:true,order_code:code,total:serverTotal});
 }catch(e){res.status(400).json({error:"تعذر إنشاء الطلب"})}
});
app.post("/api/admin/login",(req,res)=>{
 const {username,password}=req.body||{};
 if(username!==ADMIN_USER||password!==ADMIN_PASS)return res.status(401).json({error:"بيانات الدخول غير صحيحة"});
 const sid=crypto.randomBytes(32).toString("hex"); sessions.set(sid,Date.now()+8*60*60*1000);
 res.cookie("mh_admin",sid,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000});
 res.json({ok:true});
});
app.post("/api/admin/logout",auth,(req,res)=>{sessions.delete(req.cookies.mh_admin);res.clearCookie("mh_admin");res.json({ok:true})});
app.get("/api/admin/products",auth,(req,res)=>res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all()));
app.post("/api/admin/products",auth,upload.single("image"),(req,res)=>{
 const {name,description,category,price,old_price,stock,tag}=req.body;
 if(!name||!category||!price)return res.status(400).json({error:"الاسم والقسم والسعر مطلوبة"});
 const image=req.file?"/uploads/"+req.file.filename:"";
 const r=db.prepare(`INSERT INTO products(name,description,category,price,old_price,stock,tag,image)
 VALUES(?,?,?,?,?,?,?,?)`).run(name,description||"",category,+price,+old_price||0,+stock||0,tag||"",image);
 res.json({id:r.lastInsertRowid});
});
app.put("/api/admin/products/:id",auth,upload.single("image"),(req,res)=>{
 const old=db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id); if(!old)return res.status(404).json({error:"غير موجود"});
 const {name,description,category,price,old_price,stock,tag}=req.body;
 const image=req.file?"/uploads/"+req.file.filename:old.image;
 db.prepare(`UPDATE products SET name=?,description=?,category=?,price=?,old_price=?,stock=?,tag=?,image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
 .run(name,description||"",category,+price,+old_price||0,+stock||0,tag||"",image,req.params.id);
 res.json({ok:true});
});
app.delete("/api/admin/products/:id",auth,(req,res)=>{db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);res.json({ok:true})});
app.get("/api/admin/orders",auth,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all().map(o=>({...o,items:JSON.parse(o.items_json)}))));
app.patch("/api/admin/orders/:id",auth,(req,res)=>{
 const allowed=["بانتظار التحقق من الدفع","تم تأكيد الدفع","قيد التجهيز","تم الشحن","تم التسليم","ملغي"];
 if(!allowed.includes(req.body.status))return res.status(400).json({error:"حالة غير صحيحة"});
 db.prepare("UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.body.status,req.params.id);
 res.json({ok:true});
});
app.use("/uploads",express.static(path.join(ROOT,"uploads")));
app.use((req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT,()=>console.log(`MH Store running on http://localhost:${PORT}`));
