const Service = require('../models/Service');

/**
 * Seed default platform clothing service prices if none exist
 */
const seedDefaultServices = async () => {
    try {
        const count = await Service.countDocuments({ store: null });
        if (count > 0) return;

        const defaultCatalog = [
            { store: null, gender: 'Men', category: 'Casual', itemType: 'Shirt', serviceType: 'Wash & Iron', price: 50 },
            { store: null, gender: 'Men', category: 'Casual', itemType: 'T-Shirt', serviceType: 'Wash & Iron', price: 40 },
            { store: null, gender: 'Men', category: 'Casual', itemType: 'Jeans', serviceType: 'Wash & Iron', price: 70 },
            { store: null, gender: 'Men', category: 'Formal', itemType: 'Shirt', serviceType: 'Wash & Iron', price: 60 },
            { store: null, gender: 'Men', category: 'Formal', itemType: 'Trouser', serviceType: 'Wash & Iron', price: 60 },
            { store: null, gender: 'Men', category: 'Formal', itemType: 'Suit', serviceType: 'Dry Clean', price: 250 },
            { store: null, gender: 'Men', category: 'Traditional', itemType: 'Kurta', serviceType: 'Wash & Iron', price: 80 },
            { store: null, gender: 'Women', category: 'Casual', itemType: 'Top', serviceType: 'Wash & Iron', price: 50 },
            { store: null, gender: 'Women', category: 'Casual', itemType: 'Jeans', serviceType: 'Wash & Iron', price: 70 },
            { store: null, gender: 'Women', category: 'Formal', itemType: 'Shirt', serviceType: 'Wash & Iron', price: 60 },
            { store: null, gender: 'Women', category: 'Formal', itemType: 'Trouser', serviceType: 'Wash & Iron', price: 60 },
            { store: null, gender: 'Women', category: 'Saree', itemType: 'Saree', serviceType: 'Dry Clean', price: 150 },
            { store: null, gender: 'Women', category: 'Traditional', itemType: 'Salwar Kameez', serviceType: 'Wash & Iron', price: 100 },
            { store: null, gender: 'Unisex', category: 'Casual', itemType: 'Bedsheet', serviceType: 'Wash & Fold', price: 90 },
            { store: null, gender: 'Unisex', category: 'Casual', itemType: 'Blanket', serviceType: 'Dry Clean', price: 200 }
        ];

        await Service.insertMany(defaultCatalog);
        console.log('Default platform clothing pricing catalog initialized');
    } catch (err) {
        console.warn('Default services seeding notice:', err.message);
    }
};

module.exports = seedDefaultServices;
