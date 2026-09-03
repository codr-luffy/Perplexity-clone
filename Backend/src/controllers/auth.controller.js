import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/mail.services.js";

/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 * @body { username, email, password }
 */
export async function register(req, res) {
  const { username, email, password } = req.body;

  const isUserAlreadyExists = await userModel.findOne({
    $or: [{ email }, { username }],
  });

  if (isUserAlreadyExists) {
    return res.status(400).json({
      message: "User with this email or username already Exists",
      sucess: false,
      err: "User already exits",
    });
  }

  const user = await userModel.create({
    username,
    email,
    password,
  });
  const emailVerificationToken = jwt.sign(
    {
      email: user.email,
    },
    process.env.JWT_SECRET,
  );
  await sendEmail({
    to: email,
    subject: "Welcome to Perplexity!",
    html: `
           <p>Hi ${username},</p>
           <p>Thank you for registering at <strong>Perplexity</strong>. We're exited to have you on board!</p>
           <p>Please verify your email address by clicking the link below:</p>
           <a href="http://localhost:8000/api/auth/verify-email?token=${emailVerificationToken}">Verify Email</a>
           <p>If you did not create an account, please ignore this email.</p>
           <p>Best reguards,<br>The Perplexity Team</p>
       `,
  });

  res.status(201).json({
    message: "User regiatered successfully",
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * @desc Login user and return JWT token
 * @route POST /api/auth/Login
 * @access Public
 * @body { email, password }
 */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });

  if (!user) {
    return res.ststus(400).json({
      message: "Invalid email or password",
      success: false,
      err: "User not found",
    });
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return res.status(400).json({
      message: "Invalid email or password",
      success: false,
      err: "Incorrect password",
    });
  }

  if (!user.verified) {
    return res.status(400).json({
      message: "Please verify your email before logging in",
      success: false,
      err: "Email not Verified",
    });
  }

  const token = jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token);

  res.status(200).json({
    message: "Login successful",
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
}

/**
 * @desc Get current logged in user's emails
 * @routes GET /api/auth/get-me
 * @access Private
 */
export async function getMe(req, res) {
  const userId = req.user._id;

  const user = await userModel.findById(userId).select("-password");

  if (!user) {
    return res.status(404).json({
      message: "User not found",
      success: false,
      err: "User not found",
    });
  }

  res.status(200).json({
    message: "user details fetched successfully",
    success: true,
    user,
  });
}

/**
 * @desc verify user's email address
 * @route GET/api/auth/verify-email
 * @access Public
 * @query { token }
 */
export async function verifyEmail(req, res) {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findOne({ email: decoded.email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid token ",
        success: false,
        err: "user not Found",
      });
    }
    user.verified = true;

    await user.save();

    const html = `
    <h1>Email Verified successfully! </h1>
    <p>Your email has been verified. you can now login to your account.</p>
    <a href="http://localhost:8000/api/auth/login">Go to Login </a>
    `;
    return res.send(html);
  } catch (err) {
    return res.status(400).json({
      message: "Invalid or expired token",
      success: false,
      err: err.message,
    });
  }
}

/**
 * @desc Resend email verification link (with 1 min cooldown)
 * @route POST /api/auth/resend-verification-email
 * @access Public
 * @body { email }
 */
export async function resendVerificationEmail(req, res) {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found with this email",
        success: false,
        err: "User not found",
      });
    }

    if (user.verified) {
      return res.status(400).json({
        message: "This account is already verified. You can proceed to login.",
        success: false,
        err: "Account already verified",
      });
    }

    // Cooldown check (1 minute = 60,000 ms)
    const COOLDOWN_TIME = 60 * 1000;
    if (user.lastVerificationEmailSent) {
      const timeSinceLastEmail =
        Date.now() - new Date(user.lastVerificationEmailSent).getTime();

      if (timeSinceLastEmail < COOLDOWN_TIME) {
        const remainingSeconds = Math.ceil(
          (COOLDOWN_TIME - timeSinceLastEmail) / 1000,
        );
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second(s) before requesting another verification email.`,
          success: false,
          remainingSeconds,
          err: "Cooldown active",
        });
      }
    }

    const emailVerificationToken = jwt.sign(
      {
        email: user.email,
      },
      process.env.JWT_SECRET,
    );

    await sendEmail({
      to: user.email,
      subject: "Welcome to Perplexity - Verify your email",
      html: `
             <p>Hi ${user.username},</p>
             <p>You requested a new verification link for your <strong>Perplexity</strong> account.</p>
             <p>Please verify your email address by clicking the link below:</p>
             <a href="http://localhost:8000/api/auth/verify-email?token=${emailVerificationToken}">Verify Email</a>
             <p>If you did not request this, please ignore this email.</p>
             <p>Best regards,<br>The Perplexity Team</p>
         `,
    });

    user.lastVerificationEmailSent = new Date();
    await user.save();

    return res.status(200).json({
      message: "Verification email sent successfully. Please check your inbox.",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to resend verification email",
      success: false,
      err: err.message,
    });
  }
}
