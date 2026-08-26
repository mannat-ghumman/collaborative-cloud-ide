import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./db";
import workspaceRoutes from "./routes/workspaceRoutes";
import authRoutes from "./routes/authRoutes";
import {
  authenticateToken,
  AuthRequest,
} from "./middleware/authMiddleware";
import jwt from "jsonwebtoken";


const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.use(
  "/api/workspaces",
  workspaceRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

// -----------------------------
// HTTP Routes
// -----------------------------

app.get("/", (_req, res) => {
  res.json({
    message: "CloudIDE backend is running",
  });
});

app.get(
  "/api/auth/me",
  authenticateToken,
  async (
    req: AuthRequest,
    res
  ) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            id,
            username,
            email,
            avatar_url
          FROM users
          WHERE id = $1
          `,
          [req.userId]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        user: result.rows[0],
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to get user",
      });
    }
  }
);

// -----------------------------
// Socket.IO
// -----------------------------

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token;

  if (!token) {
    return next(
      new Error("Authentication required")
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      userId: string;
    };

    socket.data.userId =
      decoded.userId;

    next();
  } catch (error) {
    next(
      new Error(
        "Invalid or expired token"
      )
    );
  }
});

io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.id}`
  );
  let currentWorkspaceId: string | null = null;

  // -----------------------------
  // Join Workspace
  // -----------------------------

 socket.on(
  "join-workspace",
  async (workspaceId: string) => {
    try {
      const userId = socket.data.userId;

      console.log("JOIN WORKSPACE REQUEST:", {
        socketId: socket.id,
        userId,
        workspaceId,
      });

      if (!userId) {
        socket.emit("workspace-error", {
          message: "Authentication required",
        });

        return;
      }

      // -----------------------------------------
      // Verify workspace membership
      // -----------------------------------------

      const memberResult =
        await pool.query(
          `
          SELECT role
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
          `,
          [workspaceId, userId]
        );

      if (memberResult.rows.length === 0) {
        console.log(
          "UNAUTHORIZED WORKSPACE ACCESS:",
          {
            userId,
            workspaceId,
          }
        );

        socket.emit("workspace-error", {
          message:
            "You are not a member of this workspace",
        });

        return;
      }

      // -----------------------------------------
      // Leave previous workspace if necessary
      // -----------------------------------------

      if (
        currentWorkspaceId &&
        currentWorkspaceId !== workspaceId
      ) {
        socket.leave(
          currentWorkspaceId
        );

        const previousRoom =
          io.sockets.adapter.rooms.get(
            currentWorkspaceId
          );

        io.to(
          currentWorkspaceId
        ).emit(
          "workspace-users",
          {
            users: previousRoom
              ? Array.from(previousRoom)
              : [],
          }
        );
      }

      // -----------------------------------------
      // Join new workspace
      // -----------------------------------------

      currentWorkspaceId = workspaceId;

      socket.join(workspaceId);

      console.log(
        "SOCKET JOINED ROOM:",
        {
          socketId: socket.id,
          workspaceId,
          rooms: Array.from(
            socket.rooms
          ),
        }
      );

      // -----------------------------------------
      // Get current users AFTER joining
      // -----------------------------------------

      const room =
        io.sockets.adapter.rooms.get(
          workspaceId
        );

      const users = room
        ? Array.from(room)
        : [];

      console.log(
        "WORKSPACE USERS:",
        {
          workspaceId,
          users,
          count: users.length,
        }
      );

      // -----------------------------------------
      // Send complete user list to everyone
      // -----------------------------------------

      io.to(workspaceId).emit(
        "workspace-users",
        {
          users,
        }
      );

      // -----------------------------------------
      // Tell joining socket it succeeded
      // -----------------------------------------

      socket.emit(
        "workspace-joined",
        {
          workspaceId,
          users,
        }
      );

      // -----------------------------------------
      // Tell existing collaborators
      // -----------------------------------------

      socket
        .to(workspaceId)
        .emit(
          "user-joined",
          {
            socketId: socket.id,
          }
        );
    } catch (error) {
      console.error(
        "Join workspace error:",
        error
      );

      socket.emit(
        "workspace-error",
        {
          message:
            "Failed to join workspace",
        }
      );
    }
  }
);

  // -----------------------------
  // Disconnect
  // -----------------------------

 socket.on("disconnect", () => {
  console.log(
    `User disconnected: ${socket.id}`
  );

  if (currentWorkspaceId) {
    socket
      .to(currentWorkspaceId)
      .emit("user-left", {
        socketId: socket.id,
      });

    const room =
      io.sockets.adapter.rooms.get(
        currentWorkspaceId
      );

    const users = room
      ? Array.from(room)
      : [];

    io.to(currentWorkspaceId).emit(
      "workspace-users",
      {
        users,
      }
    );
  }
});
  // -----------------------------
// Editor Changes
// -----------------------------

socket.on(
  "editor-change",
  async (data: {
    workspaceId: string;
    filePath: string;
    content: string;
  }) => {
    try {
      const userId = socket.data.userId;

      if (!userId) {
        socket.emit("workspace-error", {
          message: "Authentication required",
        });

        return;
      }

      // Verify that the user belongs to this workspace
      const memberResult = await pool.query(
        `
        SELECT 1
        FROM workspace_members
        WHERE workspace_id = $1
          AND user_id = $2
        `,
        [data.workspaceId, userId]
      );

      if (memberResult.rows.length === 0) {
        socket.emit("workspace-error", {
          message:
            "You are not a member of this workspace",
        });

        return;
      }

      // Save the latest editor content to PostgreSQL
      const updateResult = await pool.query(
        `
        UPDATE files
        SET
          content = $1,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = $2
          AND path = $3
        RETURNING version
        `,
        [
          data.content,
          data.workspaceId,
          data.filePath,
        ]
      );

      if (updateResult.rows.length === 0) {
        socket.emit("workspace-error", {
          message: "File not found",
        });

        return;
      }

      const version =
        updateResult.rows[0].version;

      console.log(
        `File saved: ${data.filePath} (version ${version})`
      );

      // Send the change to the other collaborators
      socket
        .to(data.workspaceId)
        .emit("editor-change", {
          filePath: data.filePath,
          content: data.content,
          version,
        });
    } catch (error) {
      console.error(
        "Editor change error:",
        error
      );

      socket.emit("workspace-error", {
        message:
          "Failed to save editor changes",
      });
    }
  }
);

socket.on(
  "cursor-move",
  async (data: {
    workspaceId: string;
    filePath: string;
    position: {
      lineNumber: number;
      column: number;
    };
  }) => {
    try {
      const userId = socket.data.userId;

      if (!userId) {
        return;
      }

      const memberResult =
        await pool.query(
          `
          SELECT 1
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
          `,
          [data.workspaceId, userId]
        );

      if (
        memberResult.rows.length === 0
      ) {
        return;
      }

      socket
        .to(data.workspaceId)
        .emit("cursor-move", {
          socketId: socket.id,
          filePath: data.filePath,
          position: data.position,
        });
    } catch (error) {
      console.error(
        "Cursor move error:",
        error
      );
    }
  }
);

socket.on(
  "file-deleted",
  (data: {
    workspaceId: string;
    filePath: string;
  }) => {
    console.log(
      `File deleted: ${data.filePath}`
    );

    socket
      .to(data.workspaceId)
      .emit("file-deleted", {
        filePath: data.filePath,
      });
  }
);

socket.on(
  "file-created",
  (data: {
    workspaceId: string;
    file: {
      name: string;
      path: string;
      language: string;
      content: string;
    };
  }) => {
    console.log(
      `File created: ${data.file.path}`
    );

    socket
      .to(data.workspaceId)
      .emit("file-created", {
        file: data.file,
      });
  }
);

socket.on(
  "file-renamed",
  (data: {
    workspaceId: string;
    oldPath: string;
    file: {
      name: string;
      path: string;
      language: string;
      content: string;
    };
  }) => {
    console.log(
      `File renamed: ${data.oldPath} -> ${data.file.path}`
    );

    socket
      .to(data.workspaceId)
      .emit("file-renamed", {
        oldPath: data.oldPath,
        file: data.file,
      });
  }
);

});

// -----------------------------
// Start Server
// -----------------------------

const PORT = 3001;

pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log(
      "PostgreSQL connected:",
      result.rows[0]
    );
  })
  .catch((error) => {
    console.error(
      "PostgreSQL connection failed:",
      error
    );
  });

httpServer.listen(PORT, () => {
  console.log(
    `CloudIDE server running on http://localhost:${PORT}`
  );
});

