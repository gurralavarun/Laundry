const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
    {
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            default: null
        },
        gender: {
            type: String,
            required: [true, 'Gender is required'],
            enum: ['Men', 'Women', 'Unisex', 'Kids'],
            trim: true
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true
        },
        itemType: {
            type: String,
            required: [true, 'Item type is required'],
            trim: true
        },
        serviceType: {
            type: String,
            enum: ['Wash & Iron', 'Dry Clean', 'Wash & Fold', 'Steam Press'],
            default: 'Wash & Iron'
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price must be positive']
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

serviceSchema.index({ store: 1, gender: 1, category: 1, itemType: 1, serviceType: 1 }, { unique: true });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
