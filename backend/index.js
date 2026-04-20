import express from "express";
import redis from './src/config/redisConfig.js';
import cors from "cors";
import dotenv from "dotenv";
import {connectDB} from "./src/config/db.js"
import { initSocket } from "./src/utils/socket.js";

import videorouter from "./src/routes/video.routes.js"

import { createServer } from "http"




dotenv.config();

const app=express();
const httpServer = createServer(app);
connectDB();
initSocket(httpServer);
import "./src/workers/transcodeWorker.js"

app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/video",videorouter);

app.get("/hello",(req,res)=>{
    res.status(200).json({message:"yes i can talk to backend"});
})










































































// Galti yaha hai: app.listen nahi, httpServer.listen hoga
httpServer.listen(8000, () => {
  console.log("⚡ Matrix Server & Socket.io listening on port 8000");
});

