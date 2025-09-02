import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Emlak CRM API',
      version: '1.0.0',
      description: 'Emlak CRM sistemi için RESTful API dokümantasyonu',
      contact: {
        name: 'API Support',
        email: 'support@emlakcrm.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.emlakcrm.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            email: { type: 'string', example: 'admin@emlakcrm.com' },
            first_name: { type: 'string', example: 'Admin' },
            last_name: { type: 'string', example: 'User' },
            role: { type: 'string', example: 'admin', enum: ['admin', 'agent'] },
            status: { type: 'string', example: 'active', enum: ['active', 'inactive'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            first_name: { type: 'string', example: 'Mehmet' },
            last_name: { type: 'string', example: 'Kaya' },
            email: { type: 'string', example: 'mehmet@email.com' },
            phone: { type: 'string', example: '0532 123 4567' },
            customer_type: { type: 'string', example: 'buyer', enum: ['buyer', 'seller', 'both'] },
            budget_min: { type: 'number', example: 500000 },
            budget_max: { type: 'number', example: 800000 },
            status: { type: 'string', example: 'active', enum: ['active', 'inactive'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Property: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Merkezi Konumda 3+1 Daire' },
            description: { type: 'string', example: 'Şehir merkezinde, yeni yapılmış, asansörlü' },
            price: { type: 'number', example: 750000 },
            property_type: { type: 'string', example: 'apartment', enum: ['apartment', 'house', 'villa', 'office'] },
            bedrooms: { type: 'integer', example: 3 },
            bathrooms: { type: 'integer', example: 1 },
            address: { type: 'string', example: 'Atatürk Caddesi No:123' },
            city: { type: 'string', example: 'İstanbul' },
            status: { type: 'string', example: 'available', enum: ['available', 'sold', 'reserved'] },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Error message' },
            status: { type: 'integer', example: 400 },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Kullanıcı kimlik doğrulama işlemleri'
      },
      {
        name: 'Users',
        description: 'Kullanıcı yönetimi işlemleri'
      },
      {
        name: 'Customers',
        description: 'Müşteri yönetimi işlemleri'
      },
      {
        name: 'Properties',
        description: 'Emlak ilan yönetimi işlemleri'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'] // API dosyalarının yolu
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };



