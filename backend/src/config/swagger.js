const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Use normalized forward slashes for glob paths to ensure cross-platform Windows compatibility
const routesPath = path.resolve(__dirname, '../routes/*.js').replace(/\\/g, '/');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Laundry Management API',
            version: '1.0.0',
            description: 'REST API documentation for the Laundry Management Backend (User, Store, and Delivery Partner Business Workflows)'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token generated from /api/users/login, /api/stores/login, or /api/delivery/login'
                }
            },
            schemas: {
                // User Schemas
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1e5' },
                        name: { type: 'string', example: 'Varun' },
                        email: { type: 'string', example: 'varun@gmail.com' },
                        phone: { type: 'string', example: '9876543210' },
                        address: { type: 'string', example: 'Madhapur, Hyderabad' },
                        addresses: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Address' }
                        },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Address: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1e9' },
                        street: { type: 'string', example: 'Plot 42, Silicon Valley' },
                        city: { type: 'string', example: 'Hyderabad' },
                        state: { type: 'string', example: 'Telangana' },
                        pincode: { type: 'string', example: '500081' },
                        isDefault: { type: 'boolean', example: true }
                    }
                },
                AddressInput: {
                    type: 'object',
                    required: ['street', 'city', 'state', 'pincode'],
                    properties: {
                        street: { type: 'string', example: 'Plot 42, Silicon Valley' },
                        city: { type: 'string', example: 'Hyderabad' },
                        state: { type: 'string', example: 'Telangana' },
                        pincode: { type: 'string', example: '500081' },
                        isDefault: { type: 'boolean', example: true }
                    }
                },
                UserRegister: {
                    type: 'object',
                    required: ['name', 'email', 'phone', 'password', 'address'],
                    properties: {
                        name: { type: 'string', example: 'Varun' },
                        email: { type: 'string', example: 'varun@gmail.com' },
                        phone: { type: 'string', example: '9876543210' },
                        password: { type: 'string', example: '123456' },
                        address: { type: 'string', example: 'Hyderabad' }
                    }
                },
                UserLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'varun@gmail.com' },
                        password: { type: 'string', example: '123456' }
                    }
                },
                UserAuthResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Login successful' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                ClothingOptionsResponse: {
                    type: 'object',
                    properties: {
                        men: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['casual', 'formal', 'traditional']
                        },
                        women: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['casual', 'formal', 'saree', 'traditional']
                        }
                    }
                },

                // Store Schemas
                Store: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1e4' },
                        name: { type: 'string', example: 'Fresh Laundry' },
                        email: { type: 'string', example: 'fresh@gmail.com' },
                        gstNumber: { type: 'string', example: '29ABCDE1234F1Z5' },
                        phone: { type: 'string', example: '9876543210' },
                        address: { type: 'string', example: 'Madhapur, Hyderabad' },
                        acceptsDelivery: { type: 'boolean', example: true },
                        isOpen: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                StoreRegister: {
                    type: 'object',
                    required: ['name', 'email', 'gstNumber', 'phone', 'password', 'address'],
                    properties: {
                        name: { type: 'string', example: 'Fresh Laundry' },
                        email: { type: 'string', example: 'fresh@gmail.com' },
                        gstNumber: { type: 'string', example: '29ABCDE1234F1Z5' },
                        phone: { type: 'string', example: '9876543210' },
                        password: { type: 'string', example: '123456' },
                        address: { type: 'string', example: 'Madhapur, Hyderabad' },
                        acceptsDelivery: { type: 'boolean', example: false },
                        isOpen: { type: 'boolean', example: true }
                    }
                },
                StoreLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'fresh@gmail.com' },
                        password: { type: 'string', example: '123456' }
                    }
                },
                StoreAuthResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Login successful' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        store: { $ref: '#/components/schemas/Store' }
                    }
                },
                AvailableStore: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1e4' },
                        name: { type: 'string', example: 'Fresh Laundry' },
                        email: { type: 'string', example: 'fresh@gmail.com' },
                        phone: { type: 'string', example: '9876543210' },
                        address: { type: 'string', example: 'Madhapur, Hyderabad' },
                        acceptsDelivery: { type: 'boolean', example: true },
                        isOpen: { type: 'boolean', example: true }
                    }
                },
                StoreProfileUpdate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', example: 'Fresh Laundry Express' },
                        phone: { type: 'string', example: '9876543211' },
                        password: { type: 'string', example: 'newsecret123' },
                        address: { type: 'string', example: 'Jubilee Hills, Hyderabad' },
                        acceptsDelivery: { type: 'boolean', example: true },
                        isOpen: { type: 'boolean', example: true }
                    }
                },
                StoreStatusUpdate: {
                    type: 'object',
                    required: ['isOpen'],
                    properties: {
                        isOpen: { type: 'boolean', example: false }
                    }
                },
                StoreDeliveryUpdate: {
                    type: 'object',
                    required: ['acceptsDelivery'],
                    properties: {
                        acceptsDelivery: { type: 'boolean', example: true }
                    }
                },

                // Delivery Partner Schemas
                DeliveryPartner: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1d3' },
                        name: { type: 'string', example: 'Ravi Kumar' },
                        email: { type: 'string', example: 'ravi@gmail.com' },
                        phone: { type: 'string', example: '9876543222' },
                        vehicleType: { type: 'string', example: 'Bike' },
                        vehicleNumber: { type: 'string', example: 'TS09AB1234' },
                        isAvailable: { type: 'boolean', example: true },
                        currentLocation: { type: 'string', example: 'Madhapur, Hyderabad' },
                        isActive: { type: 'boolean', example: true }
                    }
                },
                DeliveryPartnerRegister: {
                    type: 'object',
                    required: ['name', 'email', 'phone', 'password'],
                    properties: {
                        name: { type: 'string', example: 'Ravi Kumar' },
                        email: { type: 'string', example: 'ravi@gmail.com' },
                        phone: { type: 'string', example: '9876543222' },
                        password: { type: 'string', example: '123456' },
                        vehicleType: { type: 'string', example: 'Bike' },
                        vehicleNumber: { type: 'string', example: 'TS09AB1234' },
                        currentLocation: { type: 'string', example: 'Madhapur, Hyderabad' }
                    }
                },
                DeliveryPartnerLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', example: 'ravi@gmail.com' },
                        password: { type: 'string', example: '123456' }
                    }
                },

                // Order Schemas
                OrderItem: {
                    type: 'object',
                    properties: {
                        gender: { type: 'string', example: 'Men' },
                        category: { type: 'string', example: 'Formal' },
                        itemType: { type: 'string', example: 'Shirt' },
                        quantity: { type: 'integer', example: 2 },
                        pricePerUnit: { type: 'number', example: 60 },
                        totalItemPrice: { type: 'number', example: 120 }
                    }
                },
                OrderCreate: {
                    type: 'object',
                    required: ['items', 'pickupDate', 'pickupTime'],
                    properties: {
                        storeId: { type: 'string', example: '65f2c41893cfa328b9c2a1e4' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['gender', 'category', 'itemType', 'quantity'],
                                properties: {
                                    gender: { type: 'string', enum: ['Men', 'Women', 'Unisex', 'Kids'], example: 'Men' },
                                    category: { type: 'string', example: 'Casual' },
                                    itemType: { type: 'string', example: 'Shirt' },
                                    quantity: { type: 'integer', example: 3 }
                                }
                            }
                        },
                        pickupDate: { type: 'string', format: 'date', example: '2026-09-20' },
                        pickupTime: { type: 'string', example: '10:00 AM - 12:00 PM' },
                        pickupAddress: { $ref: '#/components/schemas/AddressInput' },
                        deliveryAddress: { $ref: '#/components/schemas/AddressInput' },
                        notes: { type: 'string', example: 'Handle formal shirts with extra care' }
                    }
                },
                Order: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65f2c41893cfa328b9c2a1f1' },
                        user: { type: 'string', example: '65f2c41893cfa328b9c2a1e5' },
                        store: { type: 'string', example: '65f2c41893cfa328b9c2a1e4' },
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/OrderItem' }
                        },
                        totalAmount: { type: 'number', example: 180 },
                        orderStatus: {
                            type: 'string',
                            enum: ['pending', 'accepted', 'rejected', 'processing', 'ready', 'completed', 'cancelled'],
                            example: 'pending'
                        },
                        deliveryMode: {
                            type: 'string',
                            enum: ['store', 'external'],
                            example: 'external'
                        },
                        deliveryStatus: {
                            type: 'string',
                            enum: ['not_required', 'pending', 'assigned', 'accepted', 'picked_from_user', 'at_store', 'picked_from_store', 'out_for_delivery', 'delivered'],
                            example: 'pending'
                        },
                        paymentStatus: {
                            type: 'string',
                            enum: ['pending', 'paid', 'failed', 'refunded'],
                            example: 'pending'
                        },
                        pickupDate: { type: 'string', format: 'date-time' },
                        pickupTime: { type: 'string', example: '10:00 AM - 12:00 PM' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },

                // Service & Inventory Schemas
                ServiceInput: {
                    type: 'object',
                    required: ['gender', 'category', 'itemType', 'price'],
                    properties: {
                        gender: { type: 'string', enum: ['Men', 'Women', 'Unisex', 'Kids'], example: 'Men' },
                        category: { type: 'string', example: 'Formal' },
                        itemType: { type: 'string', example: 'Shirt' },
                        serviceType: { type: 'string', example: 'Wash & Iron' },
                        price: { type: 'number', example: 60 }
                    }
                },
                InventoryInput: {
                    type: 'object',
                    required: ['itemName', 'quantity'],
                    properties: {
                        itemName: { type: 'string', example: 'Fabric Softener' },
                        category: { type: 'string', example: 'Chemicals' },
                        quantity: { type: 'number', example: 25 },
                        unit: { type: 'string', example: 'liters' },
                        lowStockThreshold: { type: 'number', example: 5 }
                    }
                },
                StoreReport: {
                    type: 'object',
                    properties: {
                        totalOrders: { type: 'integer', example: 12 },
                        completedOrders: { type: 'integer', example: 8 },
                        pendingOrders: { type: 'integer', example: 2 },
                        acceptedOrders: { type: 'integer', example: 1 },
                        processingOrders: { type: 'integer', example: 1 },
                        cancelledOrders: { type: 'integer', example: 0 },
                        rejectedOrders: { type: 'integer', example: 1 },
                        totalRevenue: { type: 'number', example: 3450 },
                        ordersByStatus: { type: 'object' }
                    }
                },

                // Common Error Response
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error description' }
                    }
                }
            }
        }
    },
    apis: [routesPath, './src/routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = {
    swaggerUi,
    swaggerDocs
};
