// controllers/propertyController.js

import { Property } from '../models/property.model.js';
import { ApiError } from '../utiles/ApiError.js';
import { asyncHandler } from '../utiles/asyncHandler.js';
import { uploadOnCloudinary } from '../utiles/cloudinary.js';


const createProperty = asyncHandler(async (req, res) => {
    try {
        if (req.user.role === "user") {
            throw new ApiError(401, "Unauthorized request by user");
        }

        // 1. Parse the propertyData JSON
        const propertyData = JSON.parse(req.body.propertyData);

        const {
            title,
            description,
            address,
            price,
            propertyType,
            status,
            bedrooms,
            bathrooms,
            area,
            features,
            latitude,
            longitude,
            amenities
        } = propertyData;

        // 2. Basic validation
        if (!title || !price || !propertyType) {
            throw new ApiError(400, "Title, price, and property type are required");
        }

        // 3. Handle image uploads
        const imageFiles = req.files?.images;
        if (!imageFiles || imageFiles.length === 0) {
            throw new ApiError(400, "At least one property image is required");
        }

        const imageUploadPromises = (Array.isArray(imageFiles) ? imageFiles : [imageFiles]).map(image =>
            uploadOnCloudinary(image.path)
        );

        const uploadedImages = await Promise.all(imageUploadPromises);
        const imagesData = uploadedImages.map(img => ({
            public_id: img.public_id,
            url: img.secure_url
        }));

        // 4. Prepare location
        const location = (latitude !== null && longitude !== null) ? {
            type: 'Point',
            coordinates: [longitude, latitude]
        } : undefined;

        // 5. Create property
        const property = await Property.create({
            title,
            description,
            address: {
                street: address?.street,
                city: address?.city,
                state: address?.state,
                zipCode: address?.zipCode,
                country: address?.country
            },
            location,
            price,
            propertyType,
            status: status || 'available',
            bedrooms,
            bathrooms,
            area,
            images: imagesData,
            features,
            amenities,
            agent: req.user._id
        });

        // 6. Return response
        return res.status(201).json({
            success: true,
            message: "Property created successfully",
            data: property
        });

    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Error while creating property"
        );
    }
});



const getAllProperties = asyncHandler(async (req, res) => {
    console.log("get all property triggered");
    const hasQueryParams = Object.keys(req.query).length > 0;

    // Uncomment this to return all properties if no query parameters are present
    // if (!hasQueryParams) {
    //     console.log("No query");
    //     const allProperties = await Property.find({});
    //     return res.status(200).json({
    //         success: true,
    //         data: allProperties,
    //         total: allProperties.length,
    //     });
    // }

    const {
        page = 1,
        limit = 10,
        sort = '-createdAt',
        propertyType,
        status,
        minPrice,
        maxPrice,
        city,
        state,
        minBedrooms,
        maxBedrooms,
        nearLocation,
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (propertyType) {
        // Allow filtering by multiple property types (comma-separated)
        const propertyTypes = propertyType.split(',');
        filter.propertyType = { $in: propertyTypes };
    }
    if (status) filter.status = status;
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = Number(minPrice);
        if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };
    if (state) filter['address.state'] = { $regex: state, $options: 'i' };
    if (minBedrooms) filter.bedrooms = { $gte: Number(minBedrooms) };
    if (maxBedrooms) filter.bedrooms = { ...filter.bedrooms, $lte: Number(maxBedrooms) };
    if (req.query.bathrooms) {
        filter.bathrooms = { $gte: Number(req.query.bathrooms) };
      }
      
      // Modified bedrooms handling for simple "2+" style filter from frontend
      if (req.query.bedrooms) {
        filter.bedrooms = { $gte: Number(req.query.bedrooms) };
      }
    // Handle geospatial query
    if (nearLocation) {
        const [lat, lng, distance] = nearLocation.split(',').map(Number);
        filter.location = {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
                $maxDistance: distance || 100000, // Default 100km
            },
        };
    }

    const properties = await Property.find(filter)
        .populate('agent', 'name email phone')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    return res.status(200).json({
        success: true,
        data: properties,
        pagination: {
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        },
    });
});


const getPropertyById = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.query._id)
        .populate('agent', 'name email phone');

    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    return res.status(200).json({
        success: true,
        data: property
    });
});

const updateProperty = asyncHandler(async (req, res) => {
    // 1. Find property
    let property = await Property.findById(req.params.id);
    
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    // 2. Check ownership
    if (property.agent.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to update this property");
    }

    // 3. Handle new images if any
    let newImages = [];
    if (req.files?.images) {
        const imageUploadPromises = req.files.images.map(image => 
            uploadOnCloudinary(image.path)
        );

        const uploadedImages = await Promise.all(imageUploadPromises);
        newImages = uploadedImages.map(img => ({
            public_id: img.public_id,
            url: img.secure_url
        }));
    }

    // 4. Handle location update
    let locationUpdate = {};
    if (req.body.coordinates) {
        locationUpdate.location = {
            type: 'Point',
            coordinates: req.body.coordinates.split(',').map(coord => parseFloat(coord.trim()))
        };
    }

    // 5. Update property
    const updatedProperty = await Property.findByIdAndUpdate(
        req.params.id,
        {
            ...req.body,
            ...locationUpdate,
            images: [...property.images, ...newImages],
            features: req.body.features ? JSON.parse(req.body.features) : property.features
        },
        {
            new: true,
            runValidators: true
        }
    );

    return res.status(200).json({
        success: true,
        message: "Property updated successfully",
        data: updatedProperty
    });
});

const deleteProperty = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
        throw new ApiError(404, "Property not found");
    }

    if (property.agent.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to delete this property");
    }

    // Delete images from Cloudinary
    for (const image of property.images) {
        if (image.public_id) {
            await cloudinary.uploader.destroy(image.public_id);
        }
    }

    await property.deleteOne();

    return res.status(200).json({
        success: true,
        message: "Property deleted successfully"
    });
});

// Additional useful methods

const getNearbyProperties = asyncHandler(async (req, res) => {
    const { latitude, longitude, distance = 10000 } = req.query; // distance in meters

    const properties = await Property.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                $maxDistance: parseInt(distance)
            }
        }
    }).populate('agent', 'name email phone');

    return res.status(200).json({
        success: true,
        data: properties
    });
});

const getPropertyStats = asyncHandler(async (req, res) => {
    const stats = await Property.aggregate([
        {
            $group: {
                _id: '$propertyType',
                count: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        }
    ]);

    return res.status(200).json({
        success: true,
        data: stats
    });
});

const getUserProperties = asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sort = '-createdAt'
      } = req.query;
  
      const userId = req.user._id;
      const skip = (page - 1) * limit;
  
      const properties = await Property.find({ agent: userId })
        .sort(sort)
        .skip(Number(skip))
        .limit(Number(limit));
  
      const totalProperties = await Property.countDocuments({ agent: userId });
  
      return res.status(200).json({
        success: true,
        totalProperties,
        currentPage: Number(page),
        totalPages: Math.ceil(totalProperties / limit),
        data: properties
      });
    } catch (error) {
      throw new ApiError(500, "Could not get user properties: " + error);
    }
  });
  

export {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    getNearbyProperties,
    getPropertyStats,
    getUserProperties
};