import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiReference } from '@scalar/express-api-reference';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Dispatch System API is running' });
});

// Serve API Documentation via Scalar
app.use(
  '/api/docs',
  apiReference({
    theme: 'default',
    spec: {
      content: {
        openapi: '3.1.0',
        info: {
          title: 'Smart Dispatch System API',
          version: '1.0.0',
        },
        paths: {
          '/api/health': {
            get: {
              summary: 'Health check',
              responses: {
                '200': {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', example: 'ok' },
                          message: { type: 'string', example: 'Smart Dispatch System API is running' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
