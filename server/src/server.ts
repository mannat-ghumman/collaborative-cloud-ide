import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

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

  // -----------------------------
  // Join Workspace
  // -----------------------------

  socket.on(
    "join-workspace",
    (workspaceId: string) => {
      socket.join(workspaceId);

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

});

// -----------------------------
// Start Server
// -----------------------------

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(
    `CloudIDE server running on http://localhost:${PORT}`
  );
});