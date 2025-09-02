import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../config/database';
import { IUserLogin, IUserRegister, IUserResponse } from '../types';

export class AuthService {
  /**
   * Kullanıcı kaydı
   */
  static async register(userData: IUserRegister): Promise<{ user: IUserResponse; message: string }> {
    const { username, email, password, first_name, last_name, role = 'agent' } = userData;

    // Validation
    if (!username || !email || !password || !first_name || !last_name) {
      throw new Error('Tüm alanlar zorunludur');
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Kullanıcı adı veya email zaten kullanımda');
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

    return {
      user,
      message: 'Kullanıcı başarıyla oluşturuldu'
    };
  }

  /**
   * Kullanıcı girişi
   */
  static async login(loginData: IUserLogin): Promise<{ user: IUserResponse; token: string; message: string }> {
    const { username, password } = loginData;

    // Validation
    if (!username || !password) {
      throw new Error('Kullanıcı adı ve şifre zorunludur');
    }

    // Find user
    const user = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND status = $2',
      [username, 'active']
    );

    if (user.rows.length === 0) {
      throw new Error('Geçersiz kullanıcı adı veya şifre');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isValidPassword) {
      throw new Error('Geçersiz kullanıcı adı veya şifre');
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

    return {
      user: userResponse,
      token,
      message: 'Giriş başarılı'
    };
  }

  /**
   * Kullanıcı profili getir
   */
  static async getProfile(userId: string): Promise<{ user: IUserResponse; message: string }> {
    const user = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      throw new Error('Kullanıcı bulunamadı');
    }

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

    return {
      user: userResponse,
      message: 'Profil bilgileri'
    };
  }
}
