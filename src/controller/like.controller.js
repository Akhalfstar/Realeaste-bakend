import { like } from "../models/like.model.js";
import { ApiError } from "../utiles/ApiError.js";
import { asyncHandler } from "../utiles/asyncHandler.js";
import mongoose from "mongoose";

const updatelike = asyncHandler(async (req , res) => {
    try {
        const propertyId = req.body._id;
        const userId = req.user._id;

        if(!propertyId){
            throw new ApiError(400 ," Property Id not found");
        }
        const userlike = await like.findOne({
            user: new mongoose.Types.ObjectId(userId),
            property: new mongoose.Types.ObjectId(propertyId)
          });

        if(userlike){
            await like.deleteOne( { _id : userlike._id });
            return res.status(200).json({
                success: true,
                message : "Property Unliked",
                licked : false
            })
        }
        const Addlike = await like.create({
            user : userId,
            property : propertyId
        });
        return res.status(200).json({
            success : true,
            data : Addlike,
            message : "Liked Property",
            licked : true
        })
    } catch (error) {
        throw new ApiError(500 , "Could not update like status " + error);
    }
});

const likeStatus = asyncHandler(async (req , res) => {
    try {
        const propertyId = req.body._id;
        const userId = req.user._id;

        if(!propertyId){
            throw new ApiError(400 ," Property Id not found");
        }
        const userlike = await like.findOne({
            user: new mongoose.Types.ObjectId(userId),
            property: new mongoose.Types.ObjectId(propertyId)
          });

        if(userlike){
            return res.status(200).json({
                success: true,
                licked : true
            })
        }
        return res.status(200).json({
            success : true,
            licked : false
        })
    } catch (error) {
        throw new ApiError(500 , "Could not update like status " + error);
    }
});

const userlikes = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt'  
        } = req.query;
    
        const userId = req.user._id;
    
        const skip = (page - 1) * limit;
    
        const likes = await like
            .find({ user: userId })
            .populate("property")
            .sort(sort)
            .skip(Number(skip))
            .limit(Number(limit));
    
        const totalLikes = await like.countDocuments({ user: userId });
    
        return res.status(200).json({
            success: true,
            totalLikes,
            currentPage: Number(page),
            totalPages: Math.ceil(totalLikes / limit),
            data: likes
        });
    } catch (error) {
        throw new ApiError(500 , "could no5t get User likes : " + error)
    }
});


export {updatelike , userlikes , likeStatus};