import { Router } from 'express';
import { getAllUsers, toggleUserRole, getUserStats } from '../controller/admin.controller.js';


const adminRouter = Router();

// Get all users (with pagination)
adminRouter.route("/users").get( getAllUsers);

// Toggle user role (user <-> agent)
adminRouter.route("/users/:userId/role").patch( toggleUserRole);

// Get user statistics
adminRouter.route("/stats").get( getUserStats);

export default adminRouter;
