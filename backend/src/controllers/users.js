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
const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token: token });
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token: token });

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            date: new Date()
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` })
    }
}


const joinAsGuest = async (req, res) => {
    try {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const guestUsername = `Guest_${suffix}`;
        const randomPassword = crypto.randomBytes(16).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        const token = crypto.randomBytes(20).toString("hex");

        const newUser = new User({
            username: guestUsername,
            password: hashedPassword,
            token: token,
        });
        await newUser.save();

        return res.status(httpStatus.CREATED).json({ token, username: guestUsername });
    } catch (e) {
        res.json({ message: `Something went wrong ${e}` });
    }
};

export { login, register, getUserHistory, addToHistory, joinAsGuest }
