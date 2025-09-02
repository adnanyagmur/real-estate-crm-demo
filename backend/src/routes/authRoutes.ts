import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Kullanıcı kimlik doğrulama işlemleri
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               username:
 *                 type: string
 *                 example: "agent1"
 *               email:
 *                 type: string
 *                 example: "agent1@emlakcrm.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               first_name:
 *                 type: string
 *                 example: "Ahmet"
 *               last_name:
 *                 type: string
 *                 example: "Yılmaz"
 *               role:
 *                 type: string
 *                 enum: [admin, agent]
 *                 default: agent
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       409:
 *         description: Kullanıcı zaten mevcut
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "agent1"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *       401:
 *         description: Geçersiz kimlik bilgileri
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profili
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *       401:
 *         description: Yetkilendirme gerekli
 */
router.get('/profile', authenticateToken, getProfile);

export default router;

