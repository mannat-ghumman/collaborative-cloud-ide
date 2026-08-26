import { useEffect, useState } from "react";


import IDELayout from "./components/Layout/IDELayout";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";

import {
  getCurrentUser,
  getToken,
  logout,
} from "./services/auth";
import WorkspaceDashboard from "./components/Workspace/WorkspaceDashboard";

type AuthScreen =
  | "login"
  | "register";

function App() {
  const [authenticated, setAuthenticated] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [screen, setScreen] =
    useState<AuthScreen>("login");

  const [workspaceId, setWorkspaceId] =
    useState<string | null>(null);

  useEffect(() => {
    async function checkAuthentication() {
      const token = getToken();

      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        await getCurrentUser();

        setAuthenticated(true);
      } catch {
        logout();
        setAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuthentication();
  }, []);

  function handleLogout() {
    logout();

    setAuthenticated(false);
    setWorkspaceId(null);
    setScreen("login");
  }

  function handleWorkspaceSelected(
    id: string
  ) {
    setWorkspaceId(id);
  }

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "white",
        }}
      >
        Loading CloudIDE...
      </div>
    );
  }

  if (!authenticated) {
    if (screen === "register") {
      return (
        <Register
          onRegisterSuccess={() => {
            logout();
            setAuthenticated(false);
            setScreen("login");
          }}
          onLoginClick={() =>
            setScreen("login")
          }
        />
      );
    }

    return (
      <Login
        onLoginSuccess={() =>
          setAuthenticated(true)
        }
        onRegisterClick={() =>
          setScreen("register")
        }
      />
    );
  }

  /*
   * TEMPORARY
   *
   * Until we create the Dashboard,
   * show a message instead of opening
   * the IDE with the old hardcoded ID.
   */
  if (!workspaceId) {
  return (
    <WorkspaceDashboard
      onWorkspaceSelected={
        handleWorkspaceSelected
      }
      onLogout={handleLogout}
    />
  );
}

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 9999,
          padding: "8px 14px",
          border: "none",
          borderRadius: "6px",
          background: "#dc2626",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Logout
      </button>

      <IDELayout
        workspaceId={workspaceId}
      />
    </div>
  );
}

export default App;