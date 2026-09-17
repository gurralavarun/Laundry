const mongoose = require('mongoose');

const deliveryJobSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order reference is required']
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: [true, 'Store reference is required']
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryPartner',
            default: null
        },
        status: {
            type: String,
            enum: [
                'pending',
                'assigned',
                'accepted',
                'picked_from_user',
                'at_store',
                'picked_from_store',
                'out_for_delivery',
                'delivered',
                'cancelled'
            ],
            default: 'pending'
        },
        pickupAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true }
        },
        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true }
        },
        currentLocation: {
            type: String,
            trim: true,
            default: ''
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

deliveryJobSchema.index({ deliveryPartner: 1, status: 1 });
deliveryJobSchema.index({ order: 1 });

const DeliveryJob = mongoose.model('DeliveryJob', deliveryJobSchema);

module.exports = DeliveryJob;
