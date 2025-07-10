import express from "express"
import {createServer} from "node:http"
import {Server} from "socket.io"
import mongoose from "mongoose"
import cors from "cors"
import { connectToSocket } from "./controllers/socketManager.js"
const app=express();
const server=createServer(app);
const io=connectToSocket(server);
import userRoutes from "./routers/users.js"
app.set("port",(process.env.PORT || 8080));
app.use(cors());
 
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}));
app.use("/",userRoutes);
const start=async ()=>{
    const connectionDB=await mongoose.connect("mongodb+srv://pratyushchaudhary4002:hTi0q3Og95fXRUBC@cluster0.dkrpugk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    server.listen(app.get("port"),()=>{
        console.log("server working fine");
    })
}
start();