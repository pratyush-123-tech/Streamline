import {User} from "../models/user.js"
import httpStatus from "http-status"
import bcrypt,{hash} from "bcrypt"
import crypto from "crypto"
const register=async (req,res)=>{
    const {username,password}=req.body;
    try{
        const currUser=await User.findOne({username});
        if(currUser){
            return res.status(httpStatus.FOUND).json({message:"user already exists"});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const newUser=new User({
            username:username,
            password:hashedPassword
        });
        await newUser.save();
        res.status(httpStatus.CREATED).json({message:"user registered successfully"});

    }
    catch(e){
        res.json({message:`Something went wrong ${e}`});
    }
}
const login=async (req,res)=>{
    const {username,password}=req.body;
    if(!username || !password){
        return res.status(400).json({message:"Please enter"});
    }
    try{
        const user=await User.findOne({username});
        if(!user){
            return res.status(httpStatus.NOT_FOUND).json({message:"User not found"});
        }
        if(await bcrypt.compare(password,user.password)){
            let token=crypto.randomBytes(20).toString("hex");
            user.token=token;
            await user.save();
            return res.status(httpStatus.OK).json({token:token});
        }
        else{
            return res.status(httpStatus.UNAUTHORIZED).json({message:"Invalid username or password"});
        }
    }
    catch(e){
        res.json({message:`Something went wrong ${e}`});
    }
}
export {login,register};
