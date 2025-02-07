/**
 * The routes.
 *
 * @author Nelly Olofsson
 * @version 2.0.0
 */

import express from 'express'
import { router as homeRouter } from './home-router.js'
import { router as userRouter } from './user-router.js'
import { router as eventRouter } from './event-router.js'

export const router = express.Router()

router.use('/', homeRouter)
router.use('/', eventRouter)
router.use('/', userRouter)

router.use('*', (req, res, next) => {
  const error = new Error('Not Found')
  error.status = 404
  next(error)
})
