import dotenv from 'dotenv';
import ConnetDB from './db/db.js';
import { app } from './App.js';

dotenv.config();

const port = process.env.PORT || 3000;

ConnetDB()
.then( ()=> 
    app.listen(port, () => {
        console.log("Server is running at : " , port)
    })
)
.catch( (err) => 
    console.log("MonGo DB connection falied ", err)
)
 