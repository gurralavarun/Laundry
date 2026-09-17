const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/laundry';
        const conn = await mongoose.connect(mongoURI);
        console.log(`Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
