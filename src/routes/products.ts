import { Router } from 'express';
import { productController } from '../controllers/productController';

export const productsRouter = Router();

productsRouter.get('/', productController.list);
productsRouter.get('/:id', productController.getById);
productsRouter.post('/', productController.create);
productsRouter.put('/:id', productController.update);
productsRouter.delete('/:id', productController.remove);
