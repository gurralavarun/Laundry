const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
    {
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: [true, 'Store reference is required']
        },
        itemName: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true
        },
        category: {
            type: String,
            default: 'General Supplies',
            trim: true
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [0, 'Quantity cannot be negative'],
            default: 0
        },
        unit: {
            type: String,
            default: 'units',
            trim: true
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

inventorySchema.index({ store: 1, itemName: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
