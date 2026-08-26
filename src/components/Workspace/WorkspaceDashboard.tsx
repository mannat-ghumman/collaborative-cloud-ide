import { useState } from "react";
import {
  createRoom,
  joinRoom,
} from "../../services/workspace";

interface WorkspaceDashboardProps {
  onWorkspaceSelected: (
    workspaceId: string
  ) => void;

  onLogout: () => void;
}

function WorkspaceDashboard({
  onWorkspaceSelected,
  onLogout,
}: WorkspaceDashboardProps) {
  const [mode, setMode] = useState<
    "create" | "join"
  >("create");

  const [roomName, setRoomName] =
    useState("");

  const [roomId, setRoomId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [createdRoomId, setCreatedRoomId] =
    useState("");

  // -----------------------------------------
  // Create Room
  // -----------------------------------------

  async function handleCreateRoom(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await createRoom(
        roomName,
        password
      );

      const workspaceId =
        data.workspace.id;

      setCreatedRoomId(workspaceId);

      // Automatically enter the room
      onWorkspaceSelected(
        workspaceId
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create room"
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // Join Room
  // -----------------------------------------

  async function handleJoinRoom(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await joinRoom(
        roomId.trim(),
        password
      );

      const workspaceId =
        data.workspace.id;

      onWorkspaceSelected(
        workspaceId
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to join room"
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // Switch Mode
  // -----------------------------------------

  function switchMode(
    newMode: "create" | "join"
  ) {
    setMode(newMode);

    setError("");
    setPassword("");
    setRoomName("");
    setRoomId("");
    setCreatedRoomId("");
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}

        <div style={styles.header}>
          <h1 style={styles.title}>
            CloudIDE
          </h1>

          <button
            type="button"
            onClick={onLogout}
            style={styles.logout}
          >
            Logout
          </button>
        </div>

        <p style={styles.subtitle}>
          Create or join a collaborative
          workspace
        </p>

        {/* Tabs */}

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() =>
              switchMode("create")
            }
            style={{
              ...styles.tab,
              ...(mode === "create"
                ? styles.activeTab
                : {}),
            }}
          >
            Create Room
          </button>

          <button
            type="button"
            onClick={() =>
              switchMode("join")
            }
            style={{
              ...styles.tab,
              ...(mode === "join"
                ? styles.activeTab
                : {}),
            }}
          >
            Join Room
          </button>
        </div>

        {/* Error */}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* Create Room */}

        {mode === "create" && (
          <form
            onSubmit={handleCreateRoom}
          >
            <label style={styles.label}>
              Room Name
            </label>

            <input
              type="text"
              placeholder="My CloudIDE Project"
              value={roomName}
              onChange={(event) =>
                setRoomName(
                  event.target.value
                )
              }
              style={styles.input}
              required
            />

            <label style={styles.label}>
              Room Password
            </label>

            <input
              type="password"
              placeholder="Enter room password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              style={styles.input}
              required
            />

            <p style={styles.passwordHint}>
              Password must be at least 8
              characters and contain an
              uppercase letter, lowercase
              letter, number and special
              character.
            </p>

            <button
              type="submit"
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading
                ? "Creating Room..."
                : "Create Room"}
            </button>
          </form>
        )}

        {/* Join Room */}

        {mode === "join" && (
          <form
            onSubmit={handleJoinRoom}
          >
            <label style={styles.label}>
              Room ID
            </label>

            <input
              type="text"
              placeholder="Enter workspace ID"
              value={roomId}
              onChange={(event) =>
                setRoomId(
                  event.target.value
                )
              }
              style={styles.input}
              required
            />

            <label style={styles.label}>
              Room Password
            </label>

            <input
              type="password"
              placeholder="Enter room password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              style={styles.input}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading
                ? "Joining Room..."
                : "Join Room"}
            </button>
          </form>
        )}

        {/* Created Room ID */}

        {createdRoomId && (
          <div style={styles.roomInfo}>
            <p style={styles.roomInfoTitle}>
              Room created successfully
            </p>

            <p style={styles.roomId}>
              {createdRoomId}
            </p>
          </div>
        )}

        <p style={styles.footer}>
          Your workspace is stored in
          PostgreSQL and synchronized in
          real time with Socket.IO.
        </p>
      </div>
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
    padding: "20px",
    boxSizing: "border-box" as const,
  },

  card: {
    width: "420px",
    maxWidth: "100%",
    padding: "32px",
    borderRadius: "14px",
    background: "#1e293b",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.4)",
    boxSizing: "border-box" as const,
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: "8px",
    marginBottom: "26px",
  },

  logout: {
    background: "#dc2626",
    border: "none",
    borderRadius: "6px",
    padding: "7px 12px",
    color: "white",
    cursor: "pointer",
  },

  tabs: {
    display: "flex",
    marginBottom: "24px",
    borderBottom:
      "1px solid #334155",
  },

  tab: {
  flex: 1,
  padding: "12px",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: "14px",
},

activeTab: {
  color: "white",
  borderBottom: "2px solid #2563eb",
},

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#cbd5e1",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "6px",
    border:
      "1px solid #475569",
    background: "#0f172a",
    color: "white",
    fontSize: "14px",
    outline: "none",
  },

  passwordHint: {
    marginTop: "-8px",
    marginBottom: "18px",
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  primaryButton: {
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
    padding: "10px",
    marginBottom: "18px",
    borderRadius: "6px",
    background: "#450a0a",
    color: "#f87171",
    fontSize: "14px",
  },

  roomInfo: {
    marginTop: "20px",
    padding: "12px",
    borderRadius: "6px",
    background: "#0f172a",
  },

  roomInfoTitle: {
    margin: "0 0 6px",
    color: "#4ade80",
    fontSize: "14px",
  },

  roomId: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },

  footer: {
    marginTop: "24px",
    textAlign: "center" as const,
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },
};

export default WorkspaceDashboard;