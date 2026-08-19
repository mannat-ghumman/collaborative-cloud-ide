import IDELayout from "./components/Layout/IDELayout";
import { useEffect } from "react";
import socket from "./services/socket";
import { joinWorkspace } from "./services/workspace";

function App() {
  useEffect(() => {
  const workspaceId = "demo-workspace";

  socket.on(
    "workspace-joined",
    (data) => {
      console.log(
        "Joined workspace:",
        data.workspaceId
      );
    }
  );

  socket.on(
    "user-joined",
    (data) => {
      console.log(
        "Another user joined:",
        data.socketId
      );
    }
  );

  joinWorkspace(workspaceId);

  return () => {
    socket.off("workspace-joined");
    socket.off("user-joined");
  };
}, []);
  return <IDELayout />;
}

export default App;