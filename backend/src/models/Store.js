const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Store name is required'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true
        },
        gstNumber: {
            type: String,
            required: [true, 'GST number is required'],
            unique: true,
            trim: true,
            uppercase: true
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
        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true
        },
        acceptsDelivery: {
            type: Boolean,
            default: false
        },
        isOpen: {
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

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;