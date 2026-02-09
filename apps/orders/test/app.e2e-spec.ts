import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderItem, OrderEvent } from '../src/entities/order.entity';
import { Repository } from 'typeorm';

describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;

  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testProductId1 = '550e8400-e29b-41d4-a716-446655440000';
  const testProductId2 = '660e8400-e29b-41d4-a716-446655440001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    orderRepository = moduleFixture.get(getRepositoryToken(Order));
    orderItemRepository = moduleFixture.get(getRepositoryToken(OrderItem));
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data
    await orderItemRepository.delete({});
    await orderRepository.delete({});
  });

  describe('/healthz (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer()).get('/healthz').expect(200).expect({
        status: 'healthy',
        service: 'orders',
      });
    });
  });

  describe('Cart Operations', () => {
    describe('/api/v1/cart/items (POST)', () => {
      it('should add item to cart', () => {
        return request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .send({
            userId: testUserId,
            productId: testProductId1,
            quantity: 2,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.userId).toBe(testUserId);
            expect(res.body.status).toBe('cart');
            expect(res.body.items).toHaveLength(1);
            expect(res.body.items[0].productId).toBe(testProductId1);
            expect(res.body.items[0].quantity).toBe(2);
          });
      });

      it('should fail with invalid userId', () => {
        return request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .send({
            userId: 'invalid-uuid',
            productId: testProductId1,
            quantity: 1,
          })
          .expect(400);
      });

      it('should fail with invalid quantity', () => {
        return request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .send({
            userId: testUserId,
            productId: testProductId1,
            quantity: 0,
          })
          .expect(400);
      });

      it('should fail with missing fields', () => {
        return request(app.getHttpServer())
          .post('/api/v1/cart/items')
          .send({
            userId: testUserId,
          })
          .expect(400);
      });
    });

    describe('/api/v1/cart (GET)', () => {
      it('should get user cart', async () => {
        // First add item to cart
        await request(app.getHttpServer()).post('/api/v1/cart/items').send({
          userId: testUserId,
          productId: testProductId1,
          quantity: 2,
        });

        return request(app.getHttpServer())
          .get(`/api/v1/cart?userId=${testUserId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.userId).toBe(testUserId);
            expect(res.body.items).toHaveLength(1);
          });
      });

      it('should return 404 for empty cart', () => {
        return request(app.getHttpServer()).get(`/api/v1/cart?userId=${testUserId}`).expect(404);
      });
    });

    describe('/api/v1/cart/items/:itemId (DELETE)', () => {
      it('should remove item from cart', async () => {
        // First add item to cart
        const addResponse = await request(app.getHttpServer()).post('/api/v1/cart/items').send({
          userId: testUserId,
          productId: testProductId1,
          quantity: 2,
        });

        const itemId = addResponse.body.items[0].id;

        return request(app.getHttpServer())
          .delete(`/api/v1/cart/items/${itemId}?userId=${testUserId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.items).toHaveLength(0);
          });
      });
    });
  });

  describe('Order Operations', () => {
    describe('/api/v1/orders (POST)', () => {
      it('should create an order', () => {
        return request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [
              {
                productId: testProductId1,
                quantity: 2,
              },
              {
                productId: testProductId2,
                quantity: 1,
              },
            ],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.userId).toBe(testUserId);
            expect(res.body.status).toBe('pending');
            expect(res.body.items).toHaveLength(2);
            expect(res.body.shippingAddress.street).toBe('123 Main St');
          });
      });

      it('should fail with empty items', () => {
        return request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          })
          .expect(400);
      });

      it('should fail without shipping address', () => {
        return request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [
              {
                productId: testProductId1,
                quantity: 1,
              },
            ],
          })
          .expect(400);
      });
    });

    describe('/api/v1/orders/:id (GET)', () => {
      it('should get order by id', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [
              {
                productId: testProductId1,
                quantity: 2,
              },
            ],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          });

        const orderId = createResponse.body.id;

        return request(app.getHttpServer())
          .get(`/api/v1/orders/${orderId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(orderId);
            expect(res.body.userId).toBe(testUserId);
          });
      });

      it('should return 404 for non-existent order', () => {
        return request(app.getHttpServer())
          .get('/api/v1/orders/550e8400-e29b-41d4-a716-446655440099')
          .expect(404);
      });
    });

    describe('/api/v1/orders (GET)', () => {
      it('should list user orders with pagination', async () => {
        // Create multiple orders
        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [{ productId: testProductId1, quantity: 1 }],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          });

        await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [{ productId: testProductId2, quantity: 2 }],
            shippingAddress: {
              street: '456 Oak Ave',
              city: 'Los Angeles',
              state: 'CA',
              zipCode: '90001',
              country: 'US',
            },
          });

        return request(app.getHttpServer())
          .get(`/api/v1/orders?userId=${testUserId}&limit=10&offset=0`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveLength(2);
            expect(res.body.total).toBe(2);
            expect(res.body.limit).toBe(10);
            expect(res.body.offset).toBe(0);
          });
      });

      it('should support pagination', async () => {
        // Create orders
        for (let i = 0; i < 3; i++) {
          await request(app.getHttpServer())
            .post('/api/v1/orders')
            .send({
              userId: testUserId,
              items: [{ productId: testProductId1, quantity: 1 }],
              shippingAddress: {
                street: `${i} Main St`,
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94105',
                country: 'US',
              },
            });
        }

        return request(app.getHttpServer())
          .get(`/api/v1/orders?userId=${testUserId}&limit=2&offset=1`)
          .expect(200)
          .expect((res) => {
            expect(res.body.data).toHaveLength(2);
            expect(res.body.total).toBe(3);
          });
      });
    });

    describe('/api/v1/orders/:id/cancel (PUT)', () => {
      it('should cancel an order', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [{ productId: testProductId1, quantity: 1 }],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          });

        const orderId = createResponse.body.id;

        return request(app.getHttpServer())
          .put(`/api/v1/orders/${orderId}/cancel`)
          .expect(200)
          .expect((res) => {
            expect(res.body.status).toBe('cancelled');
          });
      });

      it('should not cancel already cancelled order', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/api/v1/orders')
          .send({
            userId: testUserId,
            items: [{ productId: testProductId1, quantity: 1 }],
            shippingAddress: {
              street: '123 Main St',
              city: 'San Francisco',
              state: 'CA',
              zipCode: '94105',
              country: 'US',
            },
          });

        const orderId = createResponse.body.id;

        // Cancel once
        await request(app.getHttpServer()).put(`/api/v1/orders/${orderId}/cancel`).expect(200);

        // Try to cancel again
        return request(app.getHttpServer()).put(`/api/v1/orders/${orderId}/cancel`).expect(400);
      });
    });
  });

  describe('Integration Flow', () => {
    it('should handle complete order flow', async () => {
      // 1. Add items to cart
      const cartResponse1 = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          userId: testUserId,
          productId: testProductId1,
          quantity: 2,
        })
        .expect(201);

      expect(cartResponse1.body.items).toHaveLength(1);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          userId: testUserId,
          productId: testProductId2,
          quantity: 1,
        })
        .expect(201);

      // 2. Get cart
      const getCartResponse = await request(app.getHttpServer())
        .get(`/api/v1/cart?userId=${testUserId}`)
        .expect(200);

      expect(getCartResponse.body.items).toHaveLength(2);

      // 3. Create order
      const orderResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          userId: testUserId,
          items: [
            { productId: testProductId1, quantity: 2 },
            { productId: testProductId2, quantity: 1 },
          ],
          shippingAddress: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94105',
            country: 'US',
          },
        })
        .expect(201);

      const orderId = orderResponse.body.id;
      expect(orderResponse.body.status).toBe('pending');

      // 4. Get order details
      await request(app.getHttpServer()).get(`/api/v1/orders/${orderId}`).expect(200);

      // 5. List user orders
      const listResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders?userId=${testUserId}&limit=10&offset=0`)
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThan(0);

      // 6. Cancel order
      await request(app.getHttpServer()).put(`/api/v1/orders/${orderId}/cancel`).expect(200);

      // 7. Verify order is cancelled
      const finalOrderResponse = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .expect(200);

      expect(finalOrderResponse.body.status).toBe('cancelled');
    });
  });
});
