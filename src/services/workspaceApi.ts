import type { IDEFile } from "../data/defaultFiles";

const API_URL =
  "http://localhost:3001/api";

interface WorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    created_at: string;
    updated_at: string;
  };

  files: IDEFile[];
}

export async function getWorkspace(
  workspaceId: string
): Promise<WorkspaceResponse> {
  const token =
  localStorage.getItem("cloudide_token");

  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load workspace: ${response.status}`
    );
  }

  return response.json();
}