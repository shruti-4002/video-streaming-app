import  {PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {s3Client} from "../config/awsClientConfig.js"






export const preSignedUrl=async(req,res)=>{
try{
    const {fileName,fileType,fileSize}=req.body;
    const MAX_LIMIT=30 * 1024 * 1024 ;
   
    //Size Restriction
    if (fileSize > MAX_LIMIT) {
        return res.status(400).json({ 
            error: "FILE_TOO_LARGE", 
            message: "FOR S3 Storage COST OPTIMIZATION ONLY FILE UPTO 30 MB ALLOWED" 
        });
    }

    //Format Validation (Only MP4)
    if (fileType !== 'video/mp4') {
        return res.status(400).json({ 
            error: "INVALID_FORMAT", 
            message: "ONLY MP4 FORMAT SUPPORTED." 
        });
    }

    const cleanfilename=fileName.replace(/\s+/g, '-').toLowerCase();
    const KEY=`uploads/${cleanfilename}-${Date.now()}`
    const command= new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key:KEY,
        ContentType: fileType
    })

   const url= await getSignedUrl(s3Client,command,{expiresIn:180})

    console.log(url);
return res.status(200).json({ 
          success:true ,
          url,
          key:KEY
        });
    
    }catch(error){
        console.error("S3_PRESIGNED_URL_ERROR:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }

}