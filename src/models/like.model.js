import mongoose from "mongoose";

const likemodel = new mongoose.Schema({
    user :{
        type : mongoose.Schema.ObjectId,
        ref : 'user',
        require : true
    },
    property :{
        type : mongoose.Schema.ObjectId,
        ref : 'property',
        require : true
    }
});


export const like = mongoose.model('like' , likemodel);