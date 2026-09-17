const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order reference is required']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required']
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: [true, 'Store reference is required']
        },
        amount: {
            type: Number,
            required: [true, 'Payment amount is required'],
            min: [0, 'Amount must be positive']
        },
        paymentMethod: {
            type: String,
            enum: ['card', 'upi', 'netbanking', 'cash_on_delivery', 'mock_gateway'],
            default: 'mock_gateway'
        },
        transactionId: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        paymentDate: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ store: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
