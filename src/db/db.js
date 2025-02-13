import mongoose from "mongoose";
import { DB_NAME , DB_NAME2 } from "../constant.js";

const ConnetDB =  async ()=>{
    try {
        const connectionInstant =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME2}`);
        console.log(`DB connected Done !! at prot ${process.env.PORT}` );
        // console.log(connectionInstant.connection);
    
    } catch (error) {
        console.log("MongoDb Connection Failed , could not connect : " , error);
        process.exit(1);
    }
}

export default ConnetDB;