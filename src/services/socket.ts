import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  autoConnect: true,

  auth: (callback) => {
    const token =
      localStorage.getItem("cloudide_token");

    callback({
      token,
    });
  },
});

socket.on("connect", () => {
  console.log(
    "Socket connected:",
    socket.id
  );
});

socket.on("connect_error", (error) => {
  console.error(
    "SOCKET CONNECTION ERROR:",
    error.message
  );
});

export default socket;