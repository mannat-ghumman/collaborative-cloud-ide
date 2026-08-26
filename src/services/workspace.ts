import socket from "./socket";

const API_URL = "http://localhost:3001/api/workspaces";

function getToken(): string | null {
  return localStorage.getItem("cloudide_token");
}

// -----------------------------------------
// Create Room
// -----------------------------------------

export async function createRoom(
  name: string,
  password: string,
  description?: string
) {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(
    `${API_URL}/create-room`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        name,
        password,
        description,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to create room"
    );
  }

  return data;
}

// -----------------------------------------
// Join Room
// -----------------------------------------

export async function joinRoom(
  workspaceId: string,
  password: string
) {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(
    `${API_URL}/join`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        workspaceId,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to join room"
    );
  }

  return data;
}

// -----------------------------------------
// Socket.IO
// -----------------------------------------

export function joinWorkspace(
  workspaceId: string
) {
  socket.emit(
    "join-workspace",
    workspaceId
  );
}