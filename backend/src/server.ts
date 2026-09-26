import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 FlowSuite Backend REST API running at http://localhost:${env.PORT}`);
  console.log(`📚 Swagger API Documentation available at http://localhost:${env.PORT}/api/docs`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
