const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        vehicleType: {
            type: String,
            enum: ['Bike', 'Scooter', 'Van', 'Cycle', 'Other'],
            default: 'Bike'
        },
        vehicleNumber: {
            type: String,
            trim: true,
            default: ''
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        currentLocation: {
            type: String,
            trim: true,
            default: 'Madhapur, Hyderabad'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.__v;
                return ret;
            }
        },
        toObject: {
            transform: function (doc, ret) {
                delete ret.password;
                delete ret.__v;
                return ret;
            }
        }
    }
);

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

module.exports = DeliveryPartner;
