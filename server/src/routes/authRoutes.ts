import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import pool from "../db";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

// -----------------------------------------
// Register
// -----------------------------------------

router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
    } = req.body;

    if (
      !username ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message:
          "username, email and password are required",
      });
    }

    const existingUser =
      await pool.query(
        `
        SELECT id
        FROM users
        WHERE email = $1
        `,
        [email]
      );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    if (password.length < 8) {
  return res.status(400).json({
    message:
      "Password must be at least 8 characters",
  });
}

if (!/[A-Z]/.test(password)) {
  return res.status(400).json({
    message:
      "Password must contain at least one uppercase letter",
  });
}

if (!/[a-z]/.test(password)) {
  return res.status(400).json({
    message:
      "Password must contain at least one lowercase letter",
  });
}

if (!/[0-9]/.test(password)) {
  return res.status(400).json({
    message:
      "Password must contain at least one number",
  });
}

if (
  !/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/;'`~+=]/.test(
    password
  )
) {
  return res.status(400).json({
    message:
      "Password must contain at least one special character",
  });
}

    const passwordHash =
      await bcrypt.hash(password, 10);

    const userId = randomUUID();

    const result =
      await pool.query(
        `
        INSERT INTO users (
          id,
          username,
          email,
          password_hash
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          username,
          email,
          avatar_url,
          created_at
        `,
        [
          userId,
          username,
          email,
          passwordHash,
        ]
      );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      message: "Registration failed",
    });
  }
});

// -----------------------------------------
// Login
// -----------------------------------------

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "email and password are required",
      });
    }

    const result =
      await pool.query(
        `
        SELECT
          id,
          username,
          email,
          password_hash,
          avatar_url
        FROM users
        WHERE email = $1
        `,
        [email]
      );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordValid =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

export default router;