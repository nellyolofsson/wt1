import express from 'express'
import { UserController } from '../controllers/user-controller.js'

export const router = express.Router()

const controller = new UserController()

router.post('/login/index', (req, res, next) => controller.index(req, res, next))
router.get('/login/callback', (req, res, next) => controller.handleCallback(req, res, next))
