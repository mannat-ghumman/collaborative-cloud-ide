import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./db";
import workspaceRoutes from "./routes/workspaceRoutes";

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

// -----------------------------
// HTTP Routes
// -----------------------------

app.get("/", (_req, res) => {
  res.json({
    message: "CloudIDE backend is running",
  });
});

// -----------------------------
// Socket.IO
// -----------------------------

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
    (workspaceId: string) => {
      currentWorkspaceId = workspaceId;
      socket.join(workspaceId);

      const room = io.sockets.adapter.rooms.get(
  workspaceId
);

const userCount = room
  ? room.size
  : 1;

io.to(workspaceId).emit(
  "workspace-users",
  {
    users: Array.from(room ?? []),
  }
);

      console.log(
  "ROOMS:",
  socket.rooms
);

      console.log(
        `${socket.id} joined workspace ${workspaceId}`
      );

      socket.emit(
        "workspace-joined",
        {
          workspaceId,
        }
      );

      socket.to(workspaceId).emit(
        "user-joined",
        {
          socketId: socket.id,
        }
      );
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
  (data: {
    workspaceId: string;
    filePath: string;
    content: string;
  }) => {

    socket.to(data.workspaceId).emit(
      "editor-change",
      {
        filePath: data.filePath,
        content: data.content,
      }
    );
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

