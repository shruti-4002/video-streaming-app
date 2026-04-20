import { Worker } from 'bullmq'
import redis from '../config/redisConfig.js';
import { getIO } from "../utils/socket.js"; 
import Video  from "../models/video.model.js"
import { v4 as uuidv4 } from 'uuid';
import fs from "fs"; 
import { spawn } from "child_process";
import {s3Client} from "../config/awsClientConfig.js"
import { GetObjectCommand,PutObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import path from 'path'
import { fileURLToPath } from 'url';




const worker=new Worker('V-Stream-TranscodingQueue',async(job)=>{

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    
const {fileName,key,VidID}=job.data;
const videoId = uuidv4();   
const io = getIO(); 
const cleankey=key.replace(/\//g, '_');
const localPath=path.resolve(__dirname,'..','..','temp',`-${cleankey}`);
const hlsFolderPath = path.resolve(__dirname, '..', '..', 'hls', videoId);  //creating_path_where_we_keep_hsl_Fodler

try{






//STEP 1:we retrive the s3 obj
await new Promise(async(resolve,reject)=>{
const command=new GetObjectCommand({
    Bucket:process.env.S3_BUCKET_NAME,
    Key:key
})


io.emit("statusUpdate", { message: "S3_FETCH: NODE is retriving your Video from S3 ", status: "DOWNLOADING" });

//READ THE FILE FROM S3 IN CHUNKS
const readable_Stream_Wrapper=await s3Client.send(command);
const readable_Stream_Pointer=readable_Stream_Wrapper.Body


//SAVE THE FILE IN HDD
const  write_Stream_Pointer=fs.createWriteStream(localPath);
readable_Stream_Pointer.pipe(write_Stream_Pointer);

readable_Stream_Pointer.on('error',(err)=>reject(err));
write_Stream_Pointer.on('error',(err)=> reject(err));



write_Stream_Pointer.on('finish', async () => {

console.log(`File saved locally at: ${localPath}`);
resolve("File Saved");
})

}).catch((err)=>{
    console.error("S3 Download Error:", err);
        throw err
});

io.emit("statusUpdate", { message: "Video From S3 Saved locally And FFmpeg will Start Soon.....", status: "SAVED" });





//STEP 2 NOW FILE SAVED LOCALLY WE NEED TO START FFMPEG

if (!fs.existsSync(hlsFolderPath)) {
        fs.mkdirSync(hlsFolderPath, { recursive: true });
        console.log("NEW HLS FOLDER CREATED");
    }

    //now hsl folder with unique folder created in this unique folder we need to create a index.m3u8

const finalOutputPath = path.join(hlsFolderPath, "index.m3u8");
console.log("FFmpeg will save here:", finalOutputPath);


await new Promise((resolve,reject)=>{
//MAIN FFPMEG COMMAND FOR SEGMENTS
const ffmpegArgs = [
    "-i", localPath,                        // Input
    "-threads","1",                         //my cpu based optimisation
    "-codec:v", "libx264",                  // Video Encoding H264 more compatible
    "-codec:a", "aac",                      // Audio Encoding
    "-hls_time", "10",                      // 10 sec segments
    "-hls_playlist_type", "vod",            // Video on Demand type
    "-hls_segment_filename", `${hlsFolderPath}/segment%03d.ts`, // Segments name
    "-start_number", "0",                   // Start from 0
    finalOutputPath                                 // Final Output (.m3u8)
];

const ffmpegProcess = spawn("ffmpeg", ffmpegArgs); 


console.log("GET READY FOR PROCESSED SEGMENTS TO BE UPLAODED ON S3 🥳")


io.emit("statusUpdate", { message: "GET READY FOR PROCESSED SEGMENTS TO BE UPLAODED ON S3 🥳", status: "SAVED" });


ffmpegProcess.on("close",async(code)=>{
    if(code===0)resolve();
    else reject("Error While Transcoding")
})


})


try{

    const fileArray=fs.readdirSync(hlsFolderPath);

    const uploadPromises=fileArray.map((segmentFile)=>{
                    let contentType = "video/MP2T";
                    if (segmentFile.endsWith(".m3u8")) contentType = "application/vnd.apple.mpegurl";
                    if (segmentFile.endsWith(".jpg")) contentType = "image/jpeg";


        return s3Client.send(
            new PutObjectCommand({
         Bucket:process.env.S3_BUCKET_NAME,
                 Key:`processedFolders/${videoId}/${segmentFile}`,
                Body:fs.createReadStream(
                     path.join(hlsFolderPath, segmentFile) ),
                ContentType: contentType
                    })
                )          
    })

 await Promise.all(uploadPromises).catch((err)=>{
        console.error("FFmpeg Error:", err)
        throw err;
    });


io.emit("statusUpdate", { message: "PROCESSED VIDEO CHUNKS ARE ON S3 NOW WE R CALLING CLOUDFRONT🥳", status: "SAVED" });




//STEP 3:FINAL CLODFRONT AND DB UPDATED 
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN
let updatedDoc = null;


await Video.findByIdAndUpdate(
                        VidID,
                        
                        {   
                            videoUrl: `${CLOUDFRONT_DOMAIN}/processedFolders/${videoId}/index.m3u8`,
                            status: "COMPLETED"
                        }
                        ,{new:true}
                    );


io.emit("statusUpdate", { message: "CLODFRONT IS READY TO DILIVER VIDEO CHECK REGISTRY", status: "COMPLETED" });





}catch(err){
    console.error("Upload Error:", err);
}


}catch(err){
    console.log(err)

}

finally{
try{//STEP 4:FINAL CLEAN UP FOR S3 COST OPTIMIZATION AND SAVING HDD SPACE OF MY NODE
//EMPTY TEMP FOLDER IT HAS ORIGINAL VIDEO
if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            console.log("Local Temp Video Deleted");
 }

 //EMPTY HSL FOLDER IT HAS CHUNKS
if (fs.existsSync(hlsFolderPath)) {
         fs.rmSync(hlsFolderPath, { recursive: true, force: true });
        console.log(`Specific HLS Folder Deleted: ${videoId}`); 
}

//EMPTY S3 ORIGINAL VIDEO THE PROCESSED ONE STAYS
await s3Client.send(new DeleteObjectCommand({ 
            Bucket: process.env.S3_BUCKET_NAME, 
            Key: key 
}));

console.log("DELETED")
}catch(err){
    console.log("ye error aa rha deldte pe",err.message)
}

}

},{connection:redis,concurrency:1})



worker.on("ready",()=>{

    console.log(`Worker is Ready to take up Job Working on JOB`)

});


worker.on("active", (job) => {
    console.log(`Working on JOB ID: ${job.id}`);
});


worker.on("completed",(job)=>{
console.log(`${job.id} has Completed`);





});


worker.on("Failed",(job,error)=>{
    console.log(`${job.id} has failed with ${err.message}`);
})
