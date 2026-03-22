import { Router } from 'express';
import { salesController } from '../controllers/salesController';

export const salesRouter = Router();

salesRouter.get('/', salesController.list);
salesRouter.post('/', salesController.create);
salesRouter.post('/:id/complete', salesController.complete);
salesRouter.get('/:id', salesController.getById);
