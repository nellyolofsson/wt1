import express from 'express'
import { EventClient } from '../controllers/eventclient.js'

export const router = express.Router()

const controller = new EventClient()

router.get('/login/profile', (req, res, next) => controller.userProfile(req, res, next))
router.get('/login/project', (req, res, next) => controller.userProject(req, res, next))
router.get('/login/activities', (req, res, next) => controller.userActivity(req, res, next))
router.post('/login/logout', (req, res, next) => controller.logout(req, res, next))
