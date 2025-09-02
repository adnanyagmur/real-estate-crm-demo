import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../config/database';
import { IUserLogin, IUserRegister, IUserResponse } from '../types';

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
    const { username, email, password, first_name, last_name, role = 'agent' }: IUserRegister = req.body;

    // Validation
    if (!username || !email || !password || !first_name || !last_name) {
      res.status(400).json({
        success: false,
        message: 'Tüm alanlar zorunludur',
        error: 'Missing required fields'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Kullanıcı adı veya email zaten kullanımda',
        error: 'User already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [username, email, passwordHash, first_name, last_name, role]
    );

    const user: IUserResponse = {
      id: newUser.rows[0].id,
      username: newUser.rows[0].username,
      email: newUser.rows[0].email,
      first_name: newUser.rows[0].first_name,
      last_name: newUser.rows[0].last_name,
      role: newUser.rows[0].role,
      status: newUser.rows[0].status,
      created_at: newUser.rows[0].created_at
    };

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: user
    });
  } catch (error) {
    console.error('Register error:', error);
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
    const { username, password }: IUserLogin = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre zorunludur',
        error: 'Username and password required'
      });
      return;
    }

    // Find user
    const user = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND status = $2',
      [username, 'active']
    );

    if (user.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre',
        error: 'Invalid credentials'
      });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre',
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate JWT token
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const signOptions: SignOptions = {
      expiresIn: (process.env['JWT_EXPIRES_IN'] as string) || '24h'
    } as SignOptions;

    const token = jwt.sign(
      {
        userId: user.rows[0].id,
        username: user.rows[0].username,
        role: user.rows[0].role
      },
      secret,
      signOptions
    );

    const userResponse: IUserResponse = {
      id: user.rows[0].id,
      username: user.rows[0].username,
      email: user.rows[0].email,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      role: user.rows[0].role,
      status: user.rows[0].status,
      created_at: user.rows[0].created_at
    };

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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

    const user = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profil bilgileri',
      data: user.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};
