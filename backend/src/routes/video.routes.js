import express from 'express'
import Video from "../models/video.model.js"; 
import {preSignedUrl} from "../controllers/preSignedUrl.controller.js"
import {startffmpeg} from "../controllers/startffmpeg.controller.js"
const videorouter=express.Router();

videorouter.post("/get-presigned-url",preSignedUrl)
videorouter.post("/upload-complete",startffmpeg);

videorouter.get("/all-videos", async (req, res) => {
    try {
        const videos = await Video.find({}).sort({ createdAt: -1 });
        res.status(200).json(videos);
    } catch (err) {
        res.status(500).json({ message: "FETCH_ERROR" });
    }
});



export default videorouter