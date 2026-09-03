import { Router } from "express";
import {
  register,
  login,
  verifyEmail,
  getMe,
  resendVerificationEmail,
} from "../controllers/auth.controller.js";
import {
  registerValidator,
  loginValidator,
  resendVerificationEmailValidator,
} from "../validators/auth.validators.js";
import { authUser } from "../middleware/auth.middleware.js";

const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @desc register a new user
 * @access Public
 * @body { username, email, password }
 */
authRouter.post("/register", registerValidator, register);

/**
 * @route Post /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 * @body { email, Password }
 */
authRouter.post("/login", loginValidator, login);

/**
 * @route GET /api/auth/get-me
 * @desc Get current logged in user;s details
 * @access Private
 */
authRouter.get("/get-me", authUser, getMe);

/**
 * @route Verify /api/auth/verify-email
 * @desc Verify email and verified true
 * @access Public
 * @token { token }
 */
authRouter.get("/verify-email", verifyEmail);

/**
 * @route POST /api/auth/resend-verification-email
 * @desc Resend email verification link with 1 min cooldown
 * @access Public
 * @body { email }
 */
authRouter.post(
  "/resend-verification-email",
  resendVerificationEmailValidator,
  resendVerificationEmail,
);

export default authRouter;

