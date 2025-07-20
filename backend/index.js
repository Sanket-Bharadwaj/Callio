const express = require("express");
const app = express();
const server = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

app.get("/", (req, res) => res.send("Callio Backend"));

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, username) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId, username);
    socket.on("emoji", (emoji) => {
      socket.to(roomId).emit("emoji", userId, emoji);
    });
    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => console.log(`Callio server running on port ${port}`));