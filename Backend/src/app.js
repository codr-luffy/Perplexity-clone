import express from "express";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";

const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Health check
app.get("/", (req, res) => {
  res.josn({
    message: "Server is running",
  });
});

app.use("/api/auth", authRouter);

export default app;
