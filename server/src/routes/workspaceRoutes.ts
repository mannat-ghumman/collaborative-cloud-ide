import { Router } from "express";
import bcrypt from "bcrypt";

import {
  createWorkspace,
  getWorkspace,
  getWorkspaceFiles,
  createFile,
  updateFile,
  deleteFile,
  renameFile,
} from "../repositories/workspaceRepository";

import {
  authenticateToken,
  AuthRequest,
} from "../middleware/authMiddleware";

import pool from "../db";

const router = Router();

// -----------------------------------------
// Check Workspace Membership
// -----------------------------------------

async function isWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2
    `,
    [workspaceId, userId]
  );

  return result.rows.length > 0;
}

// -----------------------------------------
// Password Validation
// -----------------------------------------

function validateRoomPassword(
  password: string
): string {
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
    !/[!@#$%^&*(),.?":{}|<>\_\-+/=[\];'`~+=]/.test(
      password
    )
  ) {
    return "Password must contain at least one special character";
  }

  return "";
}

// -----------------------------------------
// Create Room
// -----------------------------------------

router.post(
  "/create-room",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const {
        name,
        description,
        password,
      } = req.body;

      const ownerId = req.userId;

      // -----------------------------------------
      // Authentication
      // -----------------------------------------

      if (!ownerId) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      // -----------------------------------------
      // Required fields
      // -----------------------------------------

      if (!name || !password) {
        return res.status(400).json({
          message:
            "Room name and password are required",
        });
      }

      // -----------------------------------------
      // Password validation
      // -----------------------------------------

      const passwordError =
        validateRoomPassword(password);

      if (passwordError) {
        return res.status(400).json({
          message: passwordError,
        });
      }

      // -----------------------------------------
      // Hash password
      // -----------------------------------------

      const passwordHash =
        await bcrypt.hash(password, 10);

      // -----------------------------------------
      // Create workspace
      // -----------------------------------------

      const workspace =
        await createWorkspace(
          name,
          description ?? null,
          ownerId
        );

      // -----------------------------------------
      // Add owner as workspace member
      // -----------------------------------------

      await pool.query(
        `
        INSERT INTO workspace_members (
          workspace_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'owner')
        ON CONFLICT (
          workspace_id,
          user_id
        )
        DO UPDATE SET role = 'owner'
        `,
        [
          workspace.id,
          ownerId,
        ]
      );

      // -----------------------------------------
      // Create workspace settings
      // -----------------------------------------

      await pool.query(
        `
        INSERT INTO workspace_settings (
          workspace_id,
          password_hash
        )
        VALUES ($1, $2)
        ON CONFLICT (workspace_id)
        DO UPDATE SET password_hash = EXCLUDED.password_hash
        `,
        [
          workspace.id,
          passwordHash,
        ]
      );

      // -----------------------------------------
      // Return workspace
      // -----------------------------------------

      return res.status(201).json({
        message: "Room created successfully",
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description:
            workspace.description,
          owner_id:
            workspace.owner_id,
        },
      });
    } catch (error) {
      console.error(
        "Create room error:",
        error
      );

      return res.status(500).json({
        message: "Failed to create room",
      });
    }
  }
);

// -----------------------------------------
// Join Room
// -----------------------------------------

router.post(
  "/join",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const {
        workspaceId,
        password,
      } = req.body;

      const userId = req.userId;

      // -----------------------------------------
      // Authentication
      // -----------------------------------------

      if (!userId) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      // -----------------------------------------
      // Required fields
      // -----------------------------------------

      if (!workspaceId || !password) {
        return res.status(400).json({
          message:
            "workspaceId and password are required",
        });
      }

      // -----------------------------------------
      // Get workspace + password
      // -----------------------------------------

      const result =
        await pool.query(
          `
          SELECT
            w.id,
            w.name,
            w.description,
            w.owner_id,
            ws.password_hash
          FROM workspaces w
          LEFT JOIN workspace_settings ws
            ON ws.workspace_id = w.id
          WHERE w.id = $1
          `,
          [workspaceId]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Room not found",
        });
      }

      const workspace =
        result.rows[0];

      // -----------------------------------------
      // Make sure room has password
      // -----------------------------------------

      if (!workspace.password_hash) {
        return res.status(400).json({
          message:
            "This room does not have a password",
        });
      }

      // -----------------------------------------
      // Verify password
      // -----------------------------------------

      const passwordValid =
        await bcrypt.compare(
          password,
          workspace.password_hash
        );

      if (!passwordValid) {
        return res.status(401).json({
          message:
            "Invalid room password",
        });
      }

      // -----------------------------------------
      // Check existing membership
      // -----------------------------------------

      const existingMember =
        await pool.query(
          `
          SELECT role
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
          `,
          [
            workspaceId,
            userId,
          ]
        );

      // -----------------------------------------
      // Add member
      // -----------------------------------------

      if (
        existingMember.rows.length === 0
      ) {
        await pool.query(
          `
          INSERT INTO workspace_members (
            workspace_id,
            user_id,
            role
          )
          VALUES ($1, $2, 'editor')
          `,
          [
            workspaceId,
            userId,
          ]
        );
      }

      // -----------------------------------------
      // Return workspace
      // -----------------------------------------

      return res.json({
        message:
          "Joined room successfully",

        workspace: {
          id: workspace.id,
          name: workspace.name,
          description:
            workspace.description,
          owner_id:
            workspace.owner_id,
        },
      });
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to join room",
      });
    }
  }
);

// -----------------------------------------
// Get Workspace
// -----------------------------------------

router.get(
  "/:id",
  authenticateToken,
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const workspaceId =
        String(req.params.id);

        console.log("WORKSPACE AUTH DEBUG:", {
  workspaceId,
  userId: req.userId,
});

      if (!req.userId) {
        return res.status(401).json({
          message:
            "Authentication required",
        });
      }

      const member =
        await isWorkspaceMember(
          workspaceId,
          req.userId
        );

      if (!member) {
        return res.status(403).json({
          message:
            "You are not a member of this workspace",
        });
      }

      const workspace =
        await getWorkspace(
          workspaceId
        );

      if (!workspace) {
        return res.status(404).json({
          message:
            "Workspace not found",
        });
      }

      const files =
        await getWorkspaceFiles(
          workspaceId
        );

      return res.json({
        workspace,
        files,
      });
    } catch (error) {
      console.error(
        "Get workspace error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to get workspace",
      });
    }
  }
);

// -----------------------------------------
// Update File
// -----------------------------------------

router.put(
  "/:id/files",
  async (req, res) => {
    try {
      const workspaceId =
        String(req.params.id);

      const {
        filePath,
        content,
      } = req.body;

      if (
        !filePath ||
        content === undefined
      ) {
        return res.status(400).json({
          message:
            "filePath and content are required",
        });
      }

      const file =
        await updateFile(
          workspaceId,
          filePath,
          content
        );

      if (!file) {
        return res.status(404).json({
          message:
            "File not found",
        });
      }

      return res.json({
        file,
      });
    } catch (error) {
      console.error(
        "Update file error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update file",
      });
    }
  }
);

// -----------------------------------------
// Create File
// -----------------------------------------

router.post(
  "/:id/files",
  async (req, res) => {
    try {
      const workspaceId =
        String(req.params.id);

      const {
        name,
        path,
        language,
        content,
      } = req.body;

      if (
        !name ||
        !path ||
        !language
      ) {
        return res.status(400).json({
          message:
            "name, path and language are required",
        });
      }

      const file =
        await createFile(
          workspaceId,
          name,
          path,
          language,
          content ?? ""
        );

      return res.status(201).json({
        file,
      });
    } catch (error) {
      console.error(
        "Create file error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create file",
      });
    }
  }
);

// -----------------------------------------
// Rename File
// -----------------------------------------

router.put(
  "/:id/files/rename",
  async (req, res) => {
    try {
      const workspaceId =
        String(req.params.id);

      const {
        oldPath,
        newName,
        newPath,
        language,
      } = req.body;

      if (
        !oldPath ||
        !newName ||
        !newPath ||
        !language
      ) {
        return res.status(400).json({
          message:
            "oldPath, newName, newPath and language are required",
        });
      }

      const file =
        await renameFile(
          workspaceId,
          oldPath,
          newName,
          newPath,
          language
        );

      if (!file) {
        return res.status(404).json({
          message:
            "File not found",
        });
      }

      return res.json({
        file,
      });
    } catch (error) {
      console.error(
        "Rename file error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to rename file",
      });
    }
  }
);

// -----------------------------------------
// Delete File
// -----------------------------------------

router.delete(
  "/:id/files",
  async (req, res) => {
    try {
      const workspaceId =
        String(req.params.id);

      const {
        filePath,
      } = req.body;

      if (!filePath) {
        return res.status(400).json({
          message:
            "filePath is required",
        });
      }

      const file =
        await deleteFile(
          workspaceId,
          filePath
        );

      if (!file) {
        return res.status(404).json({
          message:
            "File not found",
        });
      }

      return res.json({
        message:
          "File deleted",
        file,
      });
    } catch (error) {
      console.error(
        "Delete file error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete file",
      });
    }
  }
);

// -----------------------------------------
// Seed Workspace Files
// -----------------------------------------

router.post(
  "/:id/seed-files",
  async (req, res) => {
    try {
      const workspaceId =
        String(req.params.id);

      const files = [
        {
          name: "App.tsx",
          path: "src/App.tsx",
          language:
            "typescriptreact",
          content: `function App() {
  return (
    <div>
      <h1>Hello CloudIDE</h1>
    </div>
  );
}

export default App;
`,
        },
        {
          name: "main.tsx",
          path: "src/main.tsx",
          language:
            "typescriptreact",
          content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
        },
        {
          name: "package.json",
          path: "package.json",
          language: "json",
          content: `{
  "name": "cloud-ide",
  "version": "1.0.0",
  "private": true
}
`,
        },
        {
          name: "README.md",
          path: "README.md",
          language: "markdown",
          content: `# CloudIDE

A collaborative cloud development environment.

## Features

- Browser-based editor
- Real-time collaboration
- Cloud workspaces
- Git integration
`,
        },
      ];

      const existingFiles =
        await getWorkspaceFiles(
          workspaceId
        );

      if (
        existingFiles.length > 0
      ) {
        return res.status(400).json({
          message:
            "Workspace already has files",
          files:
            existingFiles,
        });
      }

      const createdFiles = [];

      for (const file of files) {
        const createdFile =
          await createFile(
            workspaceId,
            file.name,
            file.path,
            file.language,
            file.content
          );

        createdFiles.push(
          createdFile
        );
      }

      return res.status(201).json({
        message:
          "Workspace files created",
        files:
          createdFiles,
      });
    } catch (error) {
      console.error(
        "Seed workspace files error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to seed workspace files",
      });
    }
  }
);

export default router;