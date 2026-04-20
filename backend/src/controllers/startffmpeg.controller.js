
import Video from "../models/video.model.js"

import redis from '../config/redisConfig.js';
import { getIO } from "../utils/socket.js"; 
import { Queue } from 'bullmq';
import   cloudinary  from '../config/cloudinaryConfig.js';

export const startffmpeg=async(req,res)=>{
try{

     const { fileName, key ,thumbnailData} = req.body;

     //setting up thumnail in cloudinary
    const uploadResult = await cloudinary.uploader.upload(thumbnailData, {
            folder: "v_stream_thumbnails", 
            resource_type: "image"
        });

    //set the url for video in db  and notify user
     const io = getIO(); 
     io.emit("statusUpdate", { message:"Your Video Received We initialize DATABASE AND THUMBNAIL  RETRIVED BY CLOUDINARY", status: "START" });
     
         
                 const newVideo = await Video.create({
                     title: fileName,
                     videoUrl: "PROCESSING",
                     thumbnailUrl: uploadResult.secure_url,
                     status: "PROCESSING"
         });

    //we create quque for adding jobs in redis
    const queue=new Queue("V-Stream-TranscodingQueue",{connection:redis});


    //uncomment only when u need to clean up queue if quque is full
    //  await queue.obliterate({ force: true });

    
    await queue.add("transcode",{fileName,key,VidID:newVideo._id});
    res.send("ok");

}catch(err){
    console.log("Error in Upolad",err.message)
}

}
















