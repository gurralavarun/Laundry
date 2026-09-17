const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
    {
        gender: {
            type: String,
            required: true,
            enum: ['Men', 'Women', 'Unisex', 'Kids']
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        itemType: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1']
        },
        pricePerUnit: {
            type: Number,
            required: true,
            min: [0, 'Price per unit cannot be negative']
        },
        totalItemPrice: {
            type: Number,
            required: true,
            min: [0, 'Total item price cannot be negative']
        }
    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required']
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            default: null
        },
        rejectedStores: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Store'
            }
        ],
        items: {
            type: [orderItemSchema],
            required: [true, 'Order must contain at least one item'],
            validate: {
                validator: function (v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: 'Order must contain at least one item'
            }
        },
        totalAmount: {
            type: Number,
            required: true,
            min: [0, 'Total amount must be non-negative']
        },
        pickupAddress: {
            type: addressSchema,
            required: [true, 'Pickup address is required']
        },
        deliveryAddress: {
            type: addressSchema,
            required: [true, 'Delivery address is required']
        },
        pickupDate: {
            type: Date,
            required: [true, 'Pickup date is required']
        },
        pickupTime: {
            type: String,
            required: [true, 'Pickup time is required'],
            trim: true
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'processing', 'ready', 'completed', 'cancelled'],
            default: 'pending'
        },
        deliveryMode: {
            type: String,
            enum: ['store', 'external'],
            default: 'external'
        },
        deliveryStatus: {
            type: String,
            enum: [
                'not_required',
                'pending',
                'assigned',
                'accepted',
                'picked_from_user',
                'at_store',
                'picked_from_store',
                'out_for_delivery',
                'delivered'
            ],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryPartner',
            default: null
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ store: 1, orderStatus: 1 });
orderSchema.index({ deliveryPartner: 1, deliveryStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
