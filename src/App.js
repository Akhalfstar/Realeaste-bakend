import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN.split(",");

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routers

import userRouter from "./routes/user.router.js"
import propertyRouter from "./routes/property.router.js"
import likerouter from "./routes/like.router.js"
import adminRouter from "./routes/Admin.router.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/property" , propertyRouter)
app.use("/api/v1/like" , likerouter )
app.use("/api/v1/admin" , adminRouter )



export {app}