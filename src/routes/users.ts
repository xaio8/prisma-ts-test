import { Router } from 'express';
import { userController } from '../controllers/userController';

export const usersRouter = Router();

usersRouter.get('/', userController.list);
usersRouter.get('/:id', userController.getById);
usersRouter.post('/', userController.create);
usersRouter.put('/:id', userController.update);
usersRouter.delete('/:id', userController.remove);
