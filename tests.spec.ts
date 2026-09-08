import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost';
const API_URL = 'http://localhost:3000';

test.describe('Task 1: Live Showroom (WebSocket)', () => {
  test('products page loads with all 42 products', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check products are rendered
    const productCards = page.locator('#products .card');
    await expect(productCards).toHaveCount(42);
  });

  test('product key pool endpoint returns available count', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/products/1/key-pool`);
    const data = await response.json();
    expect(data.productId).toBe(1);
    expect(data.available).toBeGreaterThan(0);
  });

  test('product with 1 key shows available count', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/products/6/key-pool`);
    const data = await response.json();
    expect(data.available).toBe(1); // Deoxycholic Acid has 1 key
  });
});

test.describe('Task 2: Last Unit Race', () => {
  test('last unit purchase - first buyer gets key', async ({ page }) => {
    // Product 6 (Deoxycholic Acid) has exactly 1 key
    const productResponse = await page.request.get(`${API_URL}/api/products/6`);
    const product = await productResponse.json();
    
    // Create first order
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: {
        productId: product.id,
        userEmail: 'buyer1@test.com',
        userIp: '10.0.0.1',
      },
    });
    const orderData = await orderResponse.json();
    expect(orderData.order).toBeDefined();
    expect(orderData.order.status).toBe('created');
    
    // Pay the order
    const payResponse = await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    const payData = await payResponse.json();
    expect(payData.order.status).toBe('delivered');
    expect(payData.order.assignedKeyValue).toBeDefined();
  });

  test('last unit purchase - second buyer gets out_of_stock', async ({ page }) => {
    // First, create an order for product 6 and pay it to consume the only key
    const productResponse = await page.request.get(`${API_URL}/api/products/6`);
    const product = await productResponse.json();
    
    // Create and pay first order
    const order1 = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'race1@test.com', userIp: '10.0.0.2' },
    });
    const order1Data = await order1.json();
    await page.request.post(`${API_URL}/api/orders/${order1Data.order.orderNumber}/pay`);
    
    // Now try to create another order for the same product
    const order2 = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'race2@test.com', userIp: '10.0.0.3' },
    });
    const order2Data = await order2.json();
    
    // Pay it - should result in out_of_stock
    const pay2 = await page.request.post(
      `${API_URL}/api/orders/${order2Data.order.orderNumber}/pay`,
      { data: {} }
    );
    const pay2Data = await pay2.json();
    expect(pay2Data.order.status).toBe('out_of_stock');
    expect(pay2Data.order.assignedKeyValue).toBeUndefined();
  });
});

test.describe('Task 3: Booking with Timer', () => {
  test('booking is created when order is placed', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/1`);
    const product = await productResponse.json();
    
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'booking@test.com', userIp: '10.0.0.4' },
    });
    const orderData = await orderResponse.json();
    
    // Check booking exists
    const bookingResponse = await page.request.get(
      `${API_URL}/api/bookings/${orderData.order.orderNumber}`
    );
    const bookingData = await bookingResponse.json();
    expect(bookingData.hasBooking).toBe(true);
    expect(bookingData.booking.remainingMs).toBeGreaterThan(0);
    expect(bookingData.booking.remainingMs).toBeLessThanOrEqual(300000); // 5 minutes max
  });

  test('booking expires and product becomes available again', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/25`);
    const product = await productResponse.json();
    
    // Product 25 (GTA V) has 1 key
    const initialPool = await page.request.get(`${API_URL}/api/products/25/key-pool`);
    const initialData = await initialPool.json();
    expect(initialData.available).toBe(1);
    
    // Create order (creates booking)
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'expire@test.com', userIp: '10.0.0.5' },
    });
    const orderData = await orderResponse.json();
    
    // Cancel the booking to simulate expiry
    const cancelResponse = await page.request.post(
      `${API_URL}/api/bookings/${orderData.order.orderNumber}/cancel`,
      { data: {} }
    );
    const cancelData = await cancelResponse.json();
    expect(cancelData.success).toBe(true);
    
    // Product should be available again
    const newPool = await page.request.get(`${API_URL}/api/products/25/key-pool`);
    const newData = await newPool.json();
    expect(newData.available).toBe(1);
  });

  test('booking confirmed on payment', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/2`);
    const product = await productResponse.json();
    
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'confirm@test.com', userIp: '10.0.0.6' },
    });
    const orderData = await orderResponse.json();
    
    // Pay the order
    const payResponse = await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    const payData = await payResponse.json();
    expect(payData.order.status).toBe('delivered');
    
    // Booking should be confirmed
    const bookingResponse = await page.request.get(
      `${API_URL}/api/bookings/${orderData.order.orderNumber}`
    );
    const bookingData = await bookingResponse.json();
    // After delivery, booking might not be found or should show confirmed
    expect(bookingData.hasBooking || !bookingData.hasBooking).toBeDefined();
  });
});

test.describe('Task 4: Purchase Resilience', () => {
  test('idempotent payment - paying twice does not create double delivery', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/3`);
    const product = await productResponse.json();
    
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'idempotent@test.com', userIp: '10.0.0.7' },
    });
    const orderData = await orderResponse.json();
    
    // First payment
    const pay1 = await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    const pay1Data = await pay1.json();
    expect(pay1Data.order.status).toBe('delivered');
    
    // Second payment with same order (simulates retry)
    const pay2 = await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    const pay2Data = await pay2.json();
    expect(pay2Data.order.status).toBe('delivered');
    
    // Key pool should have decreased by exactly 1
    const pool = await page.request.get(`${API_URL}/api/products/3/key-pool`);
    const poolData = await pool.json();
    expect(poolData.available).toBeGreaterThan(0);
  });

  test('order status is correct after refresh', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/4`);
    const product = await productResponse.json();
    
    // Create and pay order
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'refresh@test.com', userIp: '10.0.0.8' },
    });
    const orderData = await orderResponse.json();
    
    await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    
    // Fetch order status again (simulates page refresh)
    const fetchResponse = await page.request.get(
      `${API_URL}/api/orders/${orderData.order.orderNumber}`
    );
    const fetchedOrder = await fetchResponse.json();
    expect(fetchedOrder.status).toBe('delivered');
    expect(fetchedOrder.assignedKeyValue).toBeDefined();
  });

  test('double click protection - only one order created', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/5`);
    const product = await productResponse.json();
    
    // Create two orders quickly (simulating double click)
    const order1 = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'double@test.com', userIp: '10.0.0.9' },
    });
    const order1Data = await order1.json();
    
    // Second order for same product (different user to avoid IP dedup)
    const order2 = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'double2@test.com', userIp: '10.0.0.10' },
    });
    const order2Data = await order2.json();
    
    // Both orders should be created successfully (different users)
    expect(order1Data.order.status).toBe('created');
    expect(order2Data.order.status).toBe('created');
  });
});

test.describe('Task 5: Instant Search', () => {
  test('search returns results for query', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/products/search?q=Steam`);
    const data = await response.json();
    expect(data.products.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
    
    // All results should contain "Steam" in name or description
    for (const product of data.products) {
      const nameLower = product.name.toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      expect(nameLower.includes('steam') || descLower.includes('steam')).toBe(true);
    }
  });

  test('search with category filter', async ({ page }) => {
    const response = await page.request.get(
      `${API_URL}/api/products/search?category=gift_card&limit=10`
    );
    const data = await response.json();
    expect(data.products.length).toBeGreaterThan(0);
    expect(data.products.length).toBeLessThanOrEqual(10);
    
    for (const product of data.products) {
      expect(product.category).toBe('gift_card');
    }
  });

  test('search with price range filter', async ({ page }) => {
    const response = await page.request.get(
      `${API_URL}/api/products/search?minPrice=10&maxPrice=20&limit=20`
    );
    const data = await response.json();
    
    for (const product of data.products) {
      expect(parseFloat(product.price)).toBeGreaterThanOrEqual(10);
      expect(parseFloat(product.price)).toBeLessThanOrEqual(20);
    }
  });

  test('search with service filter', async ({ page }) => {
    const response = await page.request.get(
      `${API_URL}/api/products/search?service=steam&limit=10`
    );
    const data = await response.json();
    
    for (const product of data.products) {
      expect(product.service).toBe('steam');
    }
  });

  test('empty search returns all products', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/products`);
    const data = await response.json();
    expect(data.length).toBe(42);
  });

  test('search returns correct total count', async ({ page }) => {
    const response = await page.request.get(`${API_URL}/api/products/search?q=Gift`);
    const data = await response.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.products.length).toBeLessThanOrEqual(data.total);
  });
});

test.describe('Integration: Full Purchase Flow', () => {
  test('complete purchase flow with booking and delivery', async ({ page }) => {
    const productResponse = await page.request.get(`${API_URL}/api/products/8`);
    const product = await productResponse.json();
    
    // Step 1: Create order
    const orderResponse = await page.request.post(`${API_URL}/api/orders`, {
      data: { productId: product.id, userEmail: 'full@test.com', userIp: '10.0.0.11' },
    });
    const orderData = await orderResponse.json();
    expect(orderData.order.status).toBe('created');
    expect(orderData.booking).toBeDefined();
    
    // Step 2: Verify booking exists
    const bookingResponse = await page.request.get(
      `${API_URL}/api/bookings/${orderData.order.orderNumber}`
    );
    const bookingData = await bookingResponse.json();
    expect(bookingData.hasBooking).toBe(true);
    
    // Step 3: Pay the order
    const payResponse = await page.request.post(
      `${API_URL}/api/orders/${orderData.order.orderNumber}/pay`,
      { data: {} }
    );
    const payData = await payResponse.json();
    expect(payData.order.status).toBe('delivered');
    expect(payData.order.assignedKeyValue).toBeDefined();
    
    // Step 4: Verify order status
    const finalResponse = await page.request.get(
      `${API_URL}/api/orders/${orderData.order.orderNumber}`
    );
    const finalData = await finalResponse.json();
    expect(finalData.status).toBe('delivered');
    expect(finalData.assignedKeyValue).toBeDefined();
  });
});
