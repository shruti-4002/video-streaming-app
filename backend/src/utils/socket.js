// backend/socket.js
import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173", 
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("SOCKET.IO connected:");
        
        socket.on("disconnect", () => {
            console.log("SOCKET.IO disconnected");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};