import { asyncHandler } from '../utiles/asyncHandler.js';
import { user } from '../models/user.model.js';
import { ApiError } from '../utiles/ApiError.js';

// GET all users with pagination
const getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;
  
    const users = await user.find()
      .select('-password -refreshToken')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  
    // Default 'verified' field as true if it's not already set
    const usersWithVerified = users.map(user => ({
      ...user.toObject(),
      verified: user.verified !== undefined ? user.verified : true
    }));
  
    const totalUsers = await user.countDocuments();
  
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: usersWithVerified,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
  });
  
// TOGGLE user role between 'user' and 'agent'
const toggleUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  const existingUser = await user.findById(userId);

  if (!existingUser) {
    throw new ApiError(404, 'User not found');
  }

  existingUser.role = existingUser.role === 'user' ? 'agent' : 'user';
  await existingUser.save();

  res.status(200).json({
    success: true,
    message: 'User role updated successfully',
    data: {
      _id: existingUser._id,
      fullName: existingUser.fullName,
      email: existingUser.email,
      role: existingUser.role
    }
  });
});

// GET user dashboard statistics
const getUserStats = asyncHandler(async (req, res) => {
    console.log("get User stats called");
    const totalUsers = await user.countDocuments({ role: 'user' });
    const totalAgents = await user.countDocuments({ role: 'agent' });
    
    const newUsersToday = await user.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    const recentActivity = await user.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName role createdAt')
      .lean();
  
    const formattedActivity = recentActivity.map(user => ({
      message: `${user.fullName} registered as ${user.role}`,
      timeAgo: timeSince(user.createdAt),
      color: user.role === 'agent' ? 'bg-blue-500' : 'bg-green-500'
    }));
  
    res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        totalUsers,
        totalAgents,
        newUsersToday,
        recentActivity: formattedActivity
      }
    });
  });
  
  // helper function to format "time ago"
  function timeSince(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " hours ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  }
  

export {
  getAllUsers,
  toggleUserRole,
  getUserStats
};
