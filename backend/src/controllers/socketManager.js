import {Server} from "socket.io"
let connections = {}
let messages = {}
let timesOnline = {}
export const connectToSocket=(server)=>{
    const io=new Server(server,{
        cors:{
            origin:"*",
            methods:["GET","POST"],
            allowedHeaders:["*"],
            credentials:true
        }
    });
    io.on("connection",(socket)=>{
        console.log("something connected");
        socket.on("join-call",(path)=>{
            console.log(path);
            if(connections[path]===undefined){
                connections[path]=[]
            }
            connections[path].push(socket.id);
            timesOnline[socket.id]=new Date();
            for(let i=0;i<connections[path].length;i++){
                io.to(connections[path][i]).emit("user-joined",socket.id,connections[path]);

            }
            if(messages[path]!==undefined){
                for(let i=0;i< messages[path].length;i++){
                    io.to(socket.id).emit("chat-message",messages[path][i]['data'],messages[path][i]['sender'],messages[path][i]['socket-id-sender']);

                }
            }
        });
        socket.on("signal",(toID,message)=>{
            io.to(toID).emit("signal",socket.id,message);
        });
        socket.on("chat-message",(data,sender)=>{
            let isFound=false;
            let matchingRoom='';
            for(const [roomKey,users] of Object.entries(connections)){
                if(users.includes(socket.id)){
                    isFound=true;
                    matchingRoom=roomKey;
                    break;
                }
            }
            if(messages[matchingRoom]===undefined){
                messages[matchingRoom]=[];
            }
            messages[matchingRoom].push({'sender':sender,'data':data,'socket-id-sender':socket.id});
            connections[matchingRoom].forEach(element => {
                io.to(element).emit("chat-message",data,sender,socket.id);
                
            });
        });
        socket.on("disconnect",()=>{
            let diffTime=Math.abs(timesOnline[socket.id]-new Date());
            let key='';
            let index=-1;
            for(const [roomKey,users] of Object.entries(connections)){
                for(let i=0;i<users.length;i++){
                    if(users[i]===socket.id){
                        index=i;
                        key=roomKey;
                        for(let i=0;i<connections[key].length;i++){
                            io.to(connections[key][i]).emit("user-left",socket.id);
                        }
                        connections[key].splice(index,1);
                        if(connections[key].length===0){
                            delete connections[key];
                        }
                    }
                }
                    
            }

        })
    })
    return io;
}