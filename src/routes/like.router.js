import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { likeStatus, updatelike, userlikes } from "../controller/like.controller.js";


const likerouter = Router();

likerouter.route('/update').post(verifyJWT , updatelike);
likerouter.route('/userlike').get(verifyJWT , userlikes);
likerouter.route('/status').post(verifyJWT , likeStatus);

export default likerouter;