import socket from "./socket";

export function joinWorkspace(
  workspaceId: string
) {
  socket.emit(
    "join-workspace",
    workspaceId
  );
}