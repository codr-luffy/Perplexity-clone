import express from "express";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import chatRouter from "./routes/chat.routes.js";
import morgan from "morgan";
import cors from "cors";
e;

const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

//Health check
app.get("/", (req, res) => {
  res.josn({
    message: "Server is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/chats", chatRouter);

export default app;
