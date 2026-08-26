import { useState } from "react";

import { register } from "../../services/auth";

interface RegisterProps {
  onRegisterSuccess: () => void;
  onLoginClick: () => void;
}

function Register({
  onRegisterSuccess,
  onLoginClick,
}: RegisterProps) {
  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // -----------------------------------------
  // Password validation
  // -----------------------------------------

  function validatePassword(
    password: string
  ) {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }

    if (
      !/[!@#$%^&*(),.?":{}|<>_\-+/=[\];'`~]/.test(
        password
      )
    ) {
      return "Password must contain at least one special character";
    }

    return "";
  }

  // -----------------------------------------
  // Password requirement status
  // -----------------------------------------

  const passwordStarted =
    password.length > 0;

  const passwordRules = {
    length: password.length >= 8,

    uppercase:
      /[A-Z]/.test(password),

    lowercase:
      /[a-z]/.test(password),

    number:
      /[0-9]/.test(password),

    special:
      /[!@#$%^&*(),.?":{}|<>_\-+/=[\];'`~]/.test(
        password
      ),
  };

  // -----------------------------------------
  // Submit
  // -----------------------------------------

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match"
      );
      return;
    }

    setLoading(true);

    try {
      await register(
        username,
        email,
        password
      );

      // Registration should NOT
      // automatically log the user in.
      localStorage.removeItem(
        "cloudide_token"
      );

      onRegisterSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div style={styles.page}>
      <form
        onSubmit={handleSubmit}
        style={styles.card}
        autoComplete="off"
      >
        <h1 style={styles.title}>
          CloudIDE
        </h1>

        <p style={styles.subtitle}>
          Create your account
        </p>

        {/* Username */}

        <input
          type="text"
          name="username"
          autoComplete="username"
          placeholder="Username"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          style={styles.input}
          required
        />

        {/* Email */}

        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          style={styles.input}
          required
        />

        {/* Password */}

        <input
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          style={styles.input}
          required
        />

        {/* Confirm Password */}

        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          style={styles.input}
          required
        />

        {/* Password Requirements */}

        <div style={styles.passwordRules}>
          <p style={styles.rulesTitle}>
            Password must contain:
          </p>

          {/* Length */}

          <span
            style={{
              color: passwordStarted
                ? passwordRules.length
                  ? "#22c55e"
                  : "#ef4444"
                : "#94a3b8",
            }}
          >
            {passwordRules.length
              ? "✓"
              : "•"}{" "}
            At least 8 characters
          </span>

          {/* Uppercase */}

          <span
            style={{
              color: passwordStarted
                ? passwordRules.uppercase
                  ? "#22c55e"
                  : "#ef4444"
                : "#94a3b8",
            }}
          >
            {passwordRules.uppercase
              ? "✓"
              : "•"}{" "}
            One uppercase letter
          </span>

          {/* Lowercase */}

          <span
            style={{
              color: passwordStarted
                ? passwordRules.lowercase
                  ? "#22c55e"
                  : "#ef4444"
                : "#94a3b8",
            }}
          >
            {passwordRules.lowercase
              ? "✓"
              : "•"}{" "}
            One lowercase letter
          </span>

          {/* Number */}

          <span
            style={{
              color: passwordStarted
                ? passwordRules.number
                  ? "#22c55e"
                  : "#ef4444"
                : "#94a3b8",
            }}
          >
            {passwordRules.number
              ? "✓"
              : "•"}{" "}
            One number
          </span>

          {/* Special Character */}

          <span
            style={{
              color: passwordStarted
                ? passwordRules.special
                  ? "#22c55e"
                  : "#ef4444"
                : "#94a3b8",
            }}
          >
            {passwordRules.special
              ? "✓"
              : "•"}{" "}
            One special character
          </span>
        </div>

        {/* Error */}

        {error && (
          <p style={styles.error}>
            {error}
          </p>
        )}

        {/* Register */}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Creating account..."
            : "Register"}
        </button>

        {/* Login */}

        <p style={styles.footer}>
          Already have an account?{" "}

          <button
            type="button"
            onClick={onLoginClick}
            style={styles.link}
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

// -----------------------------------------
// Styles
// -----------------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    color: "white",
  },

  card: {
    width: "360px",
    padding: "32px",
    borderRadius: "12px",
    background: "#1e293b",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.4)",
  },

  title: {
    margin: 0,
    textAlign: "center" as const,
    fontSize: "32px",
  },

  subtitle: {
    textAlign: "center" as const,
    color: "#94a3b8",
    marginBottom: "28px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px",
    marginBottom: "14px",
    borderRadius: "6px",
    border: "1px solid #475569",
    background: "#0f172a",
    color: "white",
    fontSize: "14px",
  },

  passwordRules: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    marginBottom: "16px",
    fontSize: "13px",
  },

  rulesTitle: {
    margin: "0 0 4px 0",
    color: "#cbd5e1",
  },

  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
  },

  error: {
    color: "#f87171",
    fontSize: "14px",
    marginBottom: "14px",
  },

  footer: {
    textAlign: "center" as const,
    color: "#94a3b8",
    marginTop: "20px",
  },

  link: {
    background: "none",
    border: "none",
    color: "#60a5fa",
    cursor: "pointer",
  },
};

export default Register;