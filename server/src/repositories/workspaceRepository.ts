import pool from "../db";
import { randomUUID } from "crypto";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  is_directory: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------
// Create Workspace
// -----------------------------------------

export async function createWorkspace(
  name: string,
  description: string | null,
  ownerId: string
): Promise<Workspace> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const id = randomUUID();

    // Create workspace
    const workspaceResult =
      await client.query<Workspace>(
        `
        INSERT INTO workspaces (
          id,
          name,
          description,
          owner_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          id,
          name,
          description,
          ownerId,
        ]
      );

    const workspace =
      workspaceResult.rows[0];

    // Add creator as workspace owner
    await client.query(
      `
      INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role
      )
      VALUES ($1, $2, $3)
      `,
      [
        id,
        ownerId,
        "owner",
      ]
    );

    await client.query("COMMIT");

    return workspace;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// -----------------------------------------
// Get Workspace
// -----------------------------------------

export async function getWorkspace(
  workspaceId: string
): Promise<Workspace | null> {
  const result = await pool.query<Workspace>(
    `
    SELECT *
    FROM workspaces
    WHERE id = $1
    `,
    [workspaceId]
  );

  return result.rows[0] ?? null;
}

// -----------------------------------------
// Get Workspace Files
// -----------------------------------------

export async function getWorkspaceFiles(
  workspaceId: string
): Promise<WorkspaceFile[]> {
  const result =
    await pool.query<WorkspaceFile>(
      `
      SELECT *
      FROM files
      WHERE workspace_id = $1
      ORDER BY path ASC
      `,
      [workspaceId]
    );

  return result.rows;
}

// -----------------------------------------
// Create File
// -----------------------------------------

export async function createFile(
  workspaceId: string,
  name: string,
  path: string,
  language: string,
  content: string = ""
): Promise<WorkspaceFile> {
  const id = randomUUID();

  const result =
    await pool.query<WorkspaceFile>(
      `
      INSERT INTO files (
        id,
        workspace_id,
        name,
        path,
        language,
        content
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        id,
        workspaceId,
        name,
        path,
        language,
        content,
      ]
    );

  return result.rows[0];
}

// -----------------------------------------
// Update File
// -----------------------------------------

export async function updateFile(
  workspaceId: string,
  filePath: string,
  content: string
): Promise<WorkspaceFile | null> {
  const result =
    await pool.query<WorkspaceFile>(
      `
      UPDATE files
      SET
        content = $1,
        version = version + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = $2
        AND path = $3
      RETURNING *
      `,
      [
        content,
        workspaceId,
        filePath,
      ]
    );

  return result.rows[0] ?? null;
}


// -----------------------------------------
// Rename File
// -----------------------------------------

export async function renameFile(
  workspaceId: string,
  oldPath: string,
  newName: string,
  newPath: string,
  language: string
): Promise<WorkspaceFile | null> {
  const result =
    await pool.query<WorkspaceFile>(
      `
      UPDATE files
      SET
        name = $1,
        path = $2,
        language = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = $4
        AND path = $5
      RETURNING *
      `,
      [
        newName,
        newPath,
        language,
        workspaceId,
        oldPath,
      ]
    );

  return result.rows[0] ?? null;
}


// -----------------------------------------
// Delete File
// -----------------------------------------

export async function deleteFile(
  workspaceId: string,
  filePath: string
): Promise<WorkspaceFile | null> {
  const result =
    await pool.query<WorkspaceFile>(
      `
      DELETE FROM files
      WHERE workspace_id = $1
        AND path = $2
      RETURNING *
      `,
      [
        workspaceId,
        filePath,
      ]
    );

  return result.rows[0] ?? null;
}