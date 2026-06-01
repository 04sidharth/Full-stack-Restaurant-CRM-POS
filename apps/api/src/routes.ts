import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { menuRouter } from './modules/menu/menu.routes.js';
import { tableRouter } from './modules/tables/tables.routes.js';
import { orderRouter } from './modules/orders/orders.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { customerRouter } from './modules/customers/customers.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { communicationsRouter } from './modules/communications/communications.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { campaignRouter } from './modules/campaigns/campaigns.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/menu', menuRouter);
apiRouter.use('/tables', tableRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/leads', leadsRouter);
apiRouter.use('/communications', communicationsRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/campaigns', campaignRouter);
