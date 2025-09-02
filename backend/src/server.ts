import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { specs, swaggerUi } from './config/swagger';
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import propertyRoutes from './routes/propertyRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// CORS Configuration
const corsOptions = {
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:8080',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/properties', propertyRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Emlak CRM API Documentation'
}));

// Basic route for testing
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Emlak CRM Backend API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: '/api-docs'
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  
  // Test database connection
  await testConnection();
});

export default app;
