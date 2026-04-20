import dotenv from 'dotenv';
dotenv.config();
import Redis from 'ioredis';




const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASS,
  maxRetriesPerRequest: null, 
});


redis.on('connect',()=>{
    console.log("redis cloud connected");
})

redis.on('error',(err)=>{
    console.log("Redis Connection Failed",err);
})



export default redis;