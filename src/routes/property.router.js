import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createProperty, deleteProperty, getAllProperties, getNearbyProperties, getPropertyById, getPropertyStats, updateProperty } from "../controller/property.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const propertyRouter = Router();

propertyRouter.route("/createProperty").post(
    upload.fields([
        {
            name : "images"
        }
    ]),
    verifyJWT , createProperty
)

propertyRouter.route("/search").get(getAllProperties)
propertyRouter.route("/searchOne").get(getPropertyById)
propertyRouter.route("/update").post(
    upload.fields([
        {
            name : "images"
        }
    ]),
    verifyJWT , 
    updateProperty
)

propertyRouter.route("/deleteOne").post(verifyJWT , deleteProperty)
propertyRouter.route("/searchNear").get(getNearbyProperties)
propertyRouter.route("/propertyStatus").get(getPropertyStats)


export default propertyRouter;