require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const seedDefaultServices = require('./src/config/seedDefaults');
const storeRoutes = require('./src/routes/storeRoutes');
const userRoutes = require('./src/routes/userRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const deliveryRoutes = require('./src/routes/deliveryRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { swaggerUi, swaggerDocs } = require('./src/config/swagger');

const app = express();

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

connectDB().then(() => {
    seedDefaultServices();
});

app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
    res.send('Hello, World! Laundry Management Backend is running. Visit /api-docs for Swagger API documentation.');
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});