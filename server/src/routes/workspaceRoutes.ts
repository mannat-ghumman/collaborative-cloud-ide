import { Router } from "express";
import {
  createWorkspace,
  getWorkspace,
  getWorkspaceFiles,
  createFile,
  updateFile,
  deleteFile,
  renameFile,
} from "../repositories/workspaceRepository";

const router = Router();

// -----------------------------------------
// Create Workspace
// -----------------------------------------

router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      ownerId,
    } = req.body;

    if (!name || !ownerId) {
      return res.status(400).json({
        message:
          "name and ownerId are required",
      });
    }

    const workspace =
      await createWorkspace(
        name,
        description ?? null,
        ownerId
      );

    return res.status(201).json({
      workspace,
    });
  } catch (error) {
    console.error(
      "Create workspace error:",
      error
    );

    return res.status(500).json({
      message: "Failed to create workspace",
    });
  }
});

// -----------------------------------------
// Get Workspace
// -----------------------------------------

router.get("/:id", async (req, res) => {
  try {
    const workspaceId = req.params.id;

    const workspace =
      await getWorkspace(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
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
      message: "Failed to get workspace",
    });
  }
});


// -----------------------------------------
// Update File
// -----------------------------------------

router.put("/:id/files", async (req, res) => {
  try {
    const workspaceId = req.params.id;

    const {
      filePath,
      content,
    } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({
        message: "filePath and content are required",
      });
    }

    const file = await updateFile(
      workspaceId,
      filePath,
      content
    );

    if (!file) {
      return res.status(404).json({
        message: "File not found",
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
      message: "Failed to update file",
    });
  }
});

router.post("/:id/files", async (req, res) => {
  try {
    const workspaceId = req.params.id;

    const {
      name,
      path,
      language,
      content,
    } = req.body;

    if (!name || !path || !language) {
      return res.status(400).json({
        message:
          "name, path and language are required",
      });
    }

    const file = await createFile(
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
      message: "Failed to create file",
    });
  }
});

// -----------------------------------------
// Rename File
// -----------------------------------------

router.put(
  "/:id/files/rename",
  async (req, res) => {
    try {
      const workspaceId =
        req.params.id;

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
          message: "File not found",
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
        req.params.id;

      const { filePath } = req.body;

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
        message: "File deleted",
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

router.post("/:id/seed-files", async (req, res) => {
  try {
    const workspaceId = req.params.id;

    const files = [
      {
        name: "App.tsx",
        path: "src/App.tsx",
        language: "typescriptreact",
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
        language: "typescriptreact",
        content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
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
      await getWorkspaceFiles(workspaceId);

    if (existingFiles.length > 0) {
      return res.status(400).json({
        message: "Workspace already has files",
        files: existingFiles,
      });
    }

    const createdFiles = [];

    for (const file of files) {
      const createdFile = await createFile(
        workspaceId,
        file.name,
        file.path,
        file.language,
        file.content
      );

      createdFiles.push(createdFile);
    }

    return res.status(201).json({
      message: "Workspace files created",
      files: createdFiles,
    });
  } catch (error) {
    console.error(
      "Seed workspace files error:",
      error
    );

    return res.status(500).json({
      message: "Failed to seed workspace files",
    });
  }
});

export default router;