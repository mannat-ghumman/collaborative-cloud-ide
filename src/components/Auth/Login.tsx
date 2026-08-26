import { useState } from "react";
import { login } from "../../services/auth";

interface LoginProps {
  onLoginSuccess: () => void;
  onRegisterClick: () => void;
}

function Login({
  onLoginSuccess,
  onRegisterClick,
}: LoginProps) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(
        email,
        password
      );

      onLoginSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

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
          Welcome back
        </p>

        <input
  type="email"
  name="email"
  autoComplete="username"
  placeholder="Email"
  value={email}
  onChange={(event) =>
    setEmail(event.target.value)
  }
  style={styles.input}
  required
/>

<input
  type="password"
  name="password"
  autoComplete="current-password"
  placeholder="Password"
  value={password}
  onChange={(event) =>
    setPassword(event.target.value)
  }
  style={styles.input}
  required
/>

        {error && (
          <p style={styles.error}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={styles.button}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={
              onRegisterClick
            }
            style={styles.link}
          >
            Register
          </button>
        </p>
      </form>
    </div>
  );
}

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

  button: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
    cursor: "pointer",
  },

  error: {
    color: "#f87171",
    fontSize: "14px",
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

export default Login;