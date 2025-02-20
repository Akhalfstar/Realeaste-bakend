// controllers/propertyController.js

import { Property } from '../models/property.model.js';
import { ApiError } from '../utiles/ApiError.js';
import { asyncHandler } from '../utiles/asyncHandler.js';
import { uploadOnCloudinary } from '../utiles/cloudinary.js';

const createProperty = asyncHandler(async (req, res) => {
    try {
        if(req.user.role === "user"){
            throw new ApiError(401 , "Unauthorized request by user ")
        }
        // 1. Extract property details from request body
        const {
            title,
            description,
            address,
            coordinates, // [longitude, latitude]
            price,
            propertyType,
            status,
            bedrooms,
            bathrooms,
            area,
            features
        } = req.body;

        // 2. Basic validation
        if (!title || !price || !propertyType || !status) {
            throw new ApiError(400, "Title, price, and property type are required");
        }

        // 3. Handle image uploads
        const imageFiles = req.files?.images;
        if (!imageFiles || imageFiles.length === 0) {
            throw new ApiError(400, "At least one property image is required");
        }

        // 4. Upload images to Cloudinary
        const imageUploadPromises = imageFiles.map(image => 
            uploadOnCloudinary(image.path)
        );

        const uploadedImages = await Promise.all(imageUploadPromises);
        const imagesData = uploadedImages.map(img => ({
            public_id: img.public_id,
            url: img.secure_url
        }));

        // 5. Prepare location data
        const location = coordinates ? {
            type: 'Point',
            coordinates: coordinates.split(',').map(coord => parseFloat(coord.trim()))
        } : undefined;

        // 6. Create property
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
            price: Number(price),
            propertyType,
            status: status || 'available',
            bedrooms: Number(bedrooms) || 0,
            bathrooms: Number(bathrooms) || 0,
            area: Number(area),
            images: imagesData,
            features: features ? JSON.parse(features) : [],
            agent: req.user._id
        });

        // 7. Return response
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
        nearLocation, // "latitude,longitude,distance(in meters)"
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (propertyType) filter.propertyType = propertyType;
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

    // Handle geospatial query
    if (nearLocation) {
        const [lat, lng, distance] = nearLocation.split(',').map(Number);
        filter.location = {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                $maxDistance: distance || 10000 // Default 10km
            }
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
            pages: Math.ceil(total / limit)
        }
    });
});

const getPropertyById = asyncHandler(async (req, res) => {
    const property = await Property.findById(req.params.id)
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

export {
    createProperty,
    getAllProperties,
    getPropertyById,
    updateProperty,
    deleteProperty,
    getNearbyProperties,
    getPropertyStats
};