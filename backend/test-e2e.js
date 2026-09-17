const BASE_URL = 'http://localhost:3000';

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
};

const runTests = async () => {
    console.log('==================================================');
    console.log('STARTING FULL LAUNDRY MANAGEMENT E2E INTEGRATION TEST');
    console.log('==================================================\n');

    const timestamp = Date.now();

    // 1. Root & Swagger Docs check
    console.log('--- Phase 1: Server & Swagger Health ---');
    const rootRes = await fetch(`${BASE_URL}/`);
    assert(rootRes.status === 200, 'Root health endpoint returns 200');

    // 2. Register & Login User
    console.log('\n--- Phase 2: User Registration & Authentication ---');
    const userEmail = `varun_test_${timestamp}@example.com`;
    const userRegRes = await fetch(`${BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Varun Test User',
            email: userEmail,
            phone: '9876543210',
            password: 'Password123!',
            address: 'Plot 10, HITEC City, Hyderabad'
        })
    });
    const userRegData = await userRegRes.json();
    assert(userRegRes.status === 201, 'User registration succeeds (201)');
    assert(userRegData.user && !userRegData.user.password, 'User password is removed from response');

    const userLoginRes = await fetch(`${BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: userEmail,
            password: 'Password123!'
        })
    });
    const userLoginData = await userLoginRes.json();
    assert(userLoginRes.status === 200, 'User login succeeds (200)');
    const userToken = userLoginData.token;
    assert(!!userToken, 'User received JWT Bearer token');

    // User Profile & Addresses
    const userProfileRes = await fetch(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userProfileRes.status === 200, 'User can fetch own profile');

    const addAddressRes = await fetch(`${BASE_URL}/api/users/me/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
            street: 'Flat 402, Sunshine Heights',
            city: 'Hyderabad',
            state: 'Telangana',
            pincode: '500081',
            isDefault: true
        })
    });
    const addAddressData = await addAddressRes.json();
    assert(addAddressRes.status === 201, 'User can add structured address');

    // 3. Register & Login Store 1 (will reject) and Store 2 (will accept)
    console.log('\n--- Phase 3: Store Management & Availability ---');
    const store1Email = `store1_${timestamp}@example.com`;
    const store1Gst = `36A${String(timestamp).slice(-9)}1Z1`;
    const store1Reg = await fetch(`${BASE_URL}/api/stores/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Speedy Wash 1',
            email: store1Email,
            gstNumber: store1Gst,
            phone: '9123456781',
            password: 'StorePassword123!',
            address: 'Jubilee Hills, Hyderabad',
            acceptsDelivery: true,
            isOpen: true
        })
    });
    const store1RegData = await store1Reg.json();
    assert(store1Reg.status === 201, 'Store 1 registered successfully');

    const store1Login = await fetch(`${BASE_URL}/api/stores/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: store1Email,
            password: 'StorePassword123!'
        })
    });
    const store1LoginData = await store1Login.json();
    const store1Token = store1LoginData.token;
    const store1Id = store1LoginData.store._id;
    assert(!!store1Token, 'Store 1 logged in and received JWT');

    // Store 2 (external delivery partner mode)
    const store2Email = `store2_${timestamp}@example.com`;
    const store2Gst = `36B${String(timestamp).slice(-9)}2Z2`;
    const store2Reg = await fetch(`${BASE_URL}/api/stores/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Deluxe Drycleaners 2',
            email: store2Email,
            gstNumber: store2Gst,
            phone: '9123456782',
            password: 'StorePassword123!',
            address: 'Kondapur, Hyderabad',
            acceptsDelivery: false, // will trigger external delivery partner!
            isOpen: true
        })
    });
    const store2RegData = await store2Reg.json();
    assert(store2Reg.status === 201, 'Store 2 registered successfully');

    const store2Login = await fetch(`${BASE_URL}/api/stores/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: store2Email,
            password: 'StorePassword123!'
        })
    });
    const store2LoginData = await store2Login.json();
    const store2Token = store2LoginData.token;
    const store2Id = store2LoginData.store._id;
    assert(!!store2Token, 'Store 2 logged in and received JWT');

    // Available Stores query
    const availStoresRes = await fetch(`${BASE_URL}/api/stores/available`);
    const availStoresData = await availStoresRes.json();
    assert(availStoresRes.status === 200, 'Public available stores list retrieved');
    assert(availStoresData.stores.length >= 2, 'Available stores includes open stores');

    // 4. User Laundry-Order Creation Flow via User APIs
    console.log('\n--- Phase 4: User Laundry-Order Creation Flow via User APIs ---');

    // 4a. Fetch Clothing Options
    const clothingRes = await fetch(`${BASE_URL}/api/users/clothing-options`);
    const clothingData = await clothingRes.json();
    assert(clothingRes.status === 200, 'User retrieves available clothing options');
    assert(clothingData.men.includes('formal') && clothingData.women.includes('saree'), 'Clothing options includes men and women categories');

    // 4b. Validation Checks on User Order Creation
    const invalidItemsRes = await fetch(`${BASE_URL}/api/users/me/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
            storeId: store1Id,
            items: [],
            pickupDate: '2026-09-20',
            pickupTime: '10:00 AM - 12:00 PM'
        })
    });
    assert(invalidItemsRes.status === 400, 'Order creation fails when items array is empty (400)');

    const missingScheduleRes = await fetch(`${BASE_URL}/api/users/me/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
            storeId: store1Id,
            items: [{ gender: 'men', category: 'formal', itemType: 'Shirt', quantity: 1 }]
        })
    });
    assert(missingScheduleRes.status === 400, 'Order creation fails when pickup schedule is missing (400)');

    // 4c. Successful Order Creation via POST /api/users/me/orders
    const targetAddress = addAddressData.addresses.find((a) => a.street.includes('Sunshine Heights'));
    const savedAddressId = targetAddress._id;
    const orderCreateRes = await fetch(`${BASE_URL}/api/users/me/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
            storeId: store1Id,
            pickupAddressId: savedAddressId,
            items: [
                { gender: 'men', category: 'Formal', itemType: 'Shirt', quantity: 2 },
                { gender: 'women', category: 'Saree', itemType: 'Saree', quantity: 1 }
            ],
            pickupDate: '2026-09-20',
            pickupTime: '10:00 AM - 12:00 PM',
            notes: 'Iron crease on shirts'
        })
    });
    const orderCreateData = await orderCreateRes.json();
    assert(orderCreateRes.status === 201, 'User laundry order created successfully via POST /api/users/me/orders');
    const orderId = orderCreateData.order._id;
    assert(orderCreateData.order.orderStatus === 'pending', 'Initial orderStatus is "pending"');
    assert(orderCreateData.order.paymentStatus === 'pending', 'Initial paymentStatus is "pending"');
    assert(orderCreateData.order.totalAmount === 270, `Backend calculated totalAmount: ₹${orderCreateData.order.totalAmount}`);
    assert(orderCreateData.order.pickupAddress.street === 'Flat 402, Sunshine Heights', 'Address resolved accurately from user saved address ID');

    // 4d. Verify User Order Details & Track via User APIs
    const userOrderDetailRes = await fetch(`${BASE_URL}/api/users/me/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    const userOrderDetailData = await userOrderDetailRes.json();
    assert(userOrderDetailRes.status === 200, 'User can fetch order details via User API GET /api/users/me/orders/:orderId');
    assert(userOrderDetailData.order._id === orderId, 'Retrieved order matches created order ID');

    const userOrderTrackRes = await fetch(`${BASE_URL}/api/users/me/orders/${orderId}/track`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(userOrderTrackRes.status === 200, 'User can track order via User API GET /api/users/me/orders/:orderId/track');

    // 4e. Test Alias Route POST /api/users/orders
    const aliasOrderRes = await fetch(`${BASE_URL}/api/users/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
            items: [{ gender: 'unisex', category: 'Casual', itemType: 'Bedsheet', quantity: 1 }],
            pickupDate: '2026-09-21',
            pickupTime: '02:00 PM - 04:00 PM'
        })
    });
    assert(aliasOrderRes.status === 201, 'Alias route POST /api/users/orders succeeds');

    // Business Rule Test: Attempt payment before store accepts (MUST FAIL)
    console.log('\n--- Phase 5: Business Rule - Reject Payment Before Store Acceptance ---');
    const prematurePaymentRes = await fetch(`${BASE_URL}/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ paymentMethod: 'upi' })
    });
    assert(prematurePaymentRes.status === 400, 'Payment correctly rejected when store has not accepted yet (400)');

    // 5. Store 1 Rejects the Order
    console.log('\n--- Phase 6: Store Rejection & Re-Request Workflow ---');
    const rejectRes = await fetch(`${BASE_URL}/api/stores/me/orders/${orderId}/reject`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store1Token}`
        },
        body: JSON.stringify({ reason: 'Capacity full for this time slot' })
    });
    const rejectData = await rejectRes.json();
    assert(rejectRes.status === 200, 'Store 1 successfully rejected the order');
    assert(rejectData.order.orderStatus === 'rejected', 'Order status is now "rejected"');

    // 6. User Re-requests Store 2
    const reRequestRes = await fetch(`${BASE_URL}/api/orders/${orderId}/request-store`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ storeId: store2Id })
    });
    const reRequestData = await reRequestRes.json();
    assert(reRequestRes.status === 200, 'User successfully re-requested order to Store 2');
    assert(reRequestData.order.orderStatus === 'pending', 'Order status reset to "pending" for Store 2');

    // 7. Store 2 Accepts the Order
    console.log('\n--- Phase 7: Store Acceptance & Payment Completion ---');
    const acceptRes = await fetch(`${BASE_URL}/api/stores/me/orders/${orderId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${store2Token}` }
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.status === 200, 'Store 2 accepted the order');
    assert(acceptData.order.orderStatus === 'accepted', 'Order status is now "accepted"');
    assert(acceptData.order.deliveryMode === 'external', 'Delivery mode is "external" (Store 2 does not do in-house delivery)');

    // 8. User Completes Payment
    const paymentRes = await fetch(`${BASE_URL}/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ paymentMethod: 'upi' })
    });
    const paymentData = await paymentRes.json();
    assert(paymentRes.status === 200, 'Payment succeeded after store acceptance (200)');
    assert(paymentData.order.paymentStatus === 'paid', 'Order paymentStatus updated to "paid"');
    assert(!!paymentData.payment.transactionId, `Generated Transaction ID: ${paymentData.payment.transactionId}`);

    // Verify Payment Receipt
    const paymentReceiptRes = await fetch(`${BASE_URL}/api/orders/${orderId}/payment`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(paymentReceiptRes.status === 200, 'User can retrieve payment receipt');

    // 9. Store starts processing
    console.log('\n--- Phase 8: Laundry Processing & External Delivery Assignment ---');
    const processRes = await fetch(`${BASE_URL}/api/stores/me/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store2Token}`
        },
        body: JSON.stringify({ status: 'processing' })
    });
    assert(processRes.status === 200, 'Store updated order status to "processing"');

    // 10. Delivery Partner Workflow
    console.log('\n--- Phase 9: Delivery Partner Workflow ---');
    const deliveryEmail = `delivery_${timestamp}@example.com`;
    const deliveryReg = await fetch(`${BASE_URL}/api/delivery/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Ramesh Rider',
            email: deliveryEmail,
            phone: '9876543333',
            password: 'DeliveryPass123!',
            vehicleType: 'Bike',
            vehicleNumber: 'TS09EZ9999'
        })
    });
    assert(deliveryReg.status === 201, 'Delivery partner registered');

    const deliveryLogin = await fetch(`${BASE_URL}/api/delivery/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: deliveryEmail,
            password: 'DeliveryPass123!'
        })
    });
    const deliveryLoginData = await deliveryLogin.json();
    const deliveryToken = deliveryLoginData.token;
    assert(!!deliveryToken, 'Delivery partner logged in and obtained JWT');

    // Available delivery jobs
    const availableJobsRes = await fetch(`${BASE_URL}/api/delivery/available-jobs`, {
        headers: { Authorization: `Bearer ${deliveryToken}` }
    });
    const availableJobsData = await availableJobsRes.json();
    assert(availableJobsRes.status === 200, 'Delivery partner fetched available jobs');
    assert(availableJobsData.jobs.length > 0, 'Found pending delivery job for external partner');
    const deliveryJobId = availableJobsData.jobs[0]._id;

    // Delivery partner accepts job
    const acceptJobRes = await fetch(`${BASE_URL}/api/delivery/me/jobs/${deliveryJobId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${deliveryToken}` }
    });
    assert(acceptJobRes.status === 200, 'Delivery partner accepted job assignment');

    // Step-by-step delivery updates
    const stages = [
        'picked_from_user',
        'at_store',
        'picked_from_store',
        'out_for_delivery',
        'delivered'
    ];

    for (const stage of stages) {
        const updateStageRes = await fetch(`${BASE_URL}/api/delivery/me/jobs/${deliveryJobId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${deliveryToken}`
            },
            body: JSON.stringify({
                status: stage,
                currentLocation: `Near Kondapur Main Rd (${stage})`
            })
        });
        assert(updateStageRes.status === 200, `Delivery status successfully moved to: ${stage}`);
    }

    // 11. Tracking & Order History
    console.log('\n--- Phase 10: Order Tracking, Order History & Completion ---');
    const trackRes = await fetch(`${BASE_URL}/api/orders/${orderId}/track`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    const trackData = await trackRes.json();
    assert(trackRes.status === 200, 'User tracked order');
    assert(trackData.tracking.deliveryStatus === 'delivered', 'Delivery status is "delivered"');
    assert(trackData.tracking.orderStatus === 'completed', 'Order status is "completed" upon delivery');

    const userOrdersRes = await fetch(`${BASE_URL}/api/users/me/orders`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    const userOrdersData = await userOrdersRes.json();
    assert(userOrdersRes.status === 200 && userOrdersData.orders.length > 0, 'Order appears in user order history');

    // 12. Notifications check
    console.log('\n--- Phase 11: Notification System ---');
    const userNotifsRes = await fetch(`${BASE_URL}/api/notifications/me`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    const userNotifsData = await userNotifsRes.json();
    assert(userNotifsRes.status === 200, 'User fetched in-app notifications');
    assert(userNotifsData.notifications.length > 0, `User received ${userNotifsData.notifications.length} notification alerts`);

    // 13. Store Inventory & Reporting
    console.log('\n--- Phase 12: Store Inventory, Pricing & Reports ---');
    // Inventory
    const addInvRes = await fetch(`${BASE_URL}/api/stores/me/inventory`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store2Token}`
        },
        body: JSON.stringify({
            itemName: 'Eco Laundry Detergent',
            category: 'Detergents',
            quantity: 50,
            unit: 'liters',
            lowStockThreshold: 10
        })
    });
    assert(addInvRes.status === 201, 'Store added inventory stock item');

    const invListRes = await fetch(`${BASE_URL}/api/stores/me/inventory`, {
        headers: { Authorization: `Bearer ${store2Token}` }
    });
    const invListData = await invListRes.json();
    assert(invListRes.status === 200 && invListData.inventory.length > 0, 'Store retrieved inventory list');

    // Custom Pricing
    const addServiceRes = await fetch(`${BASE_URL}/api/stores/me/services`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${store2Token}`
        },
        body: JSON.stringify({
            gender: 'Men',
            category: 'Formal',
            itemType: 'Tuxedo',
            serviceType: 'Dry Clean',
            price: 350
        })
    });
    assert(addServiceRes.status === 200, 'Store set custom service pricing');

    // Reports
    const reportsRes = await fetch(`${BASE_URL}/api/stores/me/reports`, {
        headers: { Authorization: `Bearer ${store2Token}` }
    });
    const reportsData = await reportsRes.json();
    assert(reportsRes.status === 200, 'Store generated business report');
    assert(reportsData.report.completedOrders >= 1, 'Report includes completed orders');
    assert(reportsData.report.totalRevenue > 0, `Report includes totalRevenue: ₹${reportsData.report.totalRevenue}`);

    console.log('\n==================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('==================================================\n');
};

runTests().catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
});
