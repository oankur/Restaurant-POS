import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

import { config } from './config';
import { setupSocket } from './socket';
import authRoutes from './routes/auth';
import outletRoutes from './routes/outlets';
import menuRoutes from './routes/menu';
import tableRoutes from './routes/tables';
import orderRoutes from './routes/orders';
import billingRoutes from './routes/billing';
import reportRoutes from './routes/reports';
import integrationRoutes from './routes/integrations';
import categoryRoutes from './routes/categories';

export const prisma = new PrismaClient();

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: config.clientUrl, credentials: true },
});

app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/categories', categoryRoutes);

setupSocket(io);

httpServer.listen(config.port, () => {
  console.log(`\n🍽️  Restaurant POS Server`);
  console.log(`   Running on http://localhost:${config.port}`);
  console.log(`   Client: ${config.clientUrl}\n`);
});
