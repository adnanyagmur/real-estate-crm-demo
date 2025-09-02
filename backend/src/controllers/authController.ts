import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { IUserLogin, IUserRegister } from '../types';

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
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: IUserRegister = req.body;
    const result = await AuthService.register(userData);

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user
    });
  } catch (error) {
    console.error('Register error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Tüm alanlar zorunludur') {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'Missing required fields'
        });
        return;
      }
      
      if (error.message === 'Kullanıcı adı veya email zaten kullanımda') {
        res.status(409).json({
          success: false,
          message: error.message,
          error: 'User already exists'
        });
        return;
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

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
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const loginData: IUserLogin = req.body;
    const result = await AuthService.login(loginData);

    res.json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Kullanıcı adı ve şifre zorunludur') {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'Username and password required'
        });
        return;
      }
      
      if (error.message === 'Geçersiz kullanıcı adı veya şifre') {
        res.status(401).json({
          success: false,
          message: error.message,
          error: 'Invalid credentials'
        });
        return;
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

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
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli',
        error: 'Authorization required'
      });
      return;
    }

    const result = await AuthService.getProfile(userId);

    res.json({
      success: true,
      message: result.message,
      data: result.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error instanceof Error && error.message === 'Kullanıcı bulunamadı') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'User not found'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};
