import { Request, Response } from 'express';
import pool from '../config/database';
import { ICustomer, ICustomerCreate, ICustomerUpdate, IPaginatedResponse } from '../types';

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Tüm müşterileri listele
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi
 *       - in: query
 *         name: customer_type
 *         schema:
 *           type: string
 *           enum: [buyer, seller, both]
 *         description: Müşteri tipi
 *     responses:
 *       200:
 *         description: Müşteri listesi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme gerekli
 */
export const getAllCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;
    const search = req.query['search'] as string;
    const customerType = req.query['customer_type'] as string;
    
    const offset = (page - 1) * limit;
    
    // YETKİ KONTROLÜ: Admin tüm müşterileri görebilir, agent sadece kendininkileri
    let whereClause = 'WHERE c.status = $1';
    let params = ['active'];
    let paramCount = 1;
    
    // Eğer admin değilse, sadece kendi müşterilerini göster
    if (req.user && req.user.role !== 'admin') {
      paramCount++;
      whereClause += ` AND c.assigned_agent_id = $${paramCount}`;
      params.push(req.user.userId);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (customerType) {
      paramCount++;
      whereClause += ` AND c.customer_type = $${paramCount}`;
      params.push(customerType);
    }
    
    // Get total count with JOIN
    const countQuery = `
      SELECT COUNT(*) FROM customers c
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get customers with pagination and JOIN
    paramCount++;
    const customersQuery = `
      SELECT 
        c.*,
        u.username as agent_username,
        u.first_name as agent_first_name,
        u.last_name as agent_last_name
      FROM customers c
      JOIN users u ON c.assigned_agent_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    const customersResult = await pool.query(customersQuery, [...params, limit, offset]);
    
    const totalPages = Math.ceil(total / limit);
    
    const response: IPaginatedResponse<ICustomer> = {
      success: true,
      message: 'Müşteriler başarıyla getirildi',
      data: customersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: ID ile müşteri getir
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Müşteri ID (UUID)
 *     responses:
 *       200:
 *         description: Müşteri başarıyla getirildi
 *       404:
 *         description: Müşteri bulunamadı
 */
export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // YETKİ KONTROLÜ: Admin tüm müşterileri görebilir, agent sadece kendininkileri
    let query = `
      SELECT c.*, u.username as agent_username, u.first_name as agent_first_name, u.last_name as agent_last_name
      FROM customers c
      JOIN users u ON c.assigned_agent_id = u.id
      WHERE c.id = $1 AND c.status = $2
    `;
    let params = [id, 'active'];
    
    if (req.user && req.user.role !== 'admin') {
      query += ' AND c.assigned_agent_id = $3';
      params.push(req.user.userId);
    }
    
    const customer = await pool.query(query, params);
    
    if (customer.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı',
        error: 'Customer not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla getirildi',
      data: customer.rows[0]
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Yeni müşteri oluştur
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Müşteri başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerData: ICustomerCreate = req.body;
    
    // Validation
    if (!customerData.first_name || !customerData.last_name || !customerData.email) {
      res.status(400).json({
        success: false,
        message: 'Ad, soyad ve email zorunludur',
        error: 'Missing required fields'
      });
      return;
    }
    
    // YETKİ KONTROLÜ: Admin tüm agent'lara müşteri atayabilir, agent sadece kendine
    let assignedAgentId = customerData.assigned_agent_id;
    if (req.user && req.user.role !== 'admin') {
      assignedAgentId = req.user.userId;
    }
    
    // Check if email already exists for this agent
    const existingCustomer = await pool.query(
      'SELECT id FROM customers WHERE email = $1 AND assigned_agent_id = $2 AND status = $3',
      [customerData.email, assignedAgentId, 'active']
    );
    
    if (existingCustomer.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Bu email adresi zaten kullanımda',
        error: 'Email already exists'
      });
      return;
    }
    
    // Create customer
    const newCustomer = await pool.query(
      `INSERT INTO customers (
        first_name, last_name, email, phone, customer_type, 
        budget_min, budget_max, status, assigned_agent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        customerData.first_name,
        customerData.last_name,
        customerData.email,
        customerData.phone || null,
        customerData.customer_type || 'buyer',
        customerData.budget_min || null,
        customerData.budget_max || null,
        'active',
        assignedAgentId
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Müşteri başarıyla oluşturuldu',
      data: newCustomer.rows[0]
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Müşteri bilgilerini güncelle
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Müşteri ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Müşteri başarıyla güncellendi
 *       404:
 *         description: Müşteri bulunamadı
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: ICustomerUpdate = req.body;
    
    // YETKİ KONTROLÜ: Admin tüm müşterileri güncelleyebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status = $2';
    let params = [id, 'active'];
    
    if (req.user && req.user.role !== 'admin') {
      whereClause += ' AND assigned_agent_id = $3';
      params.push(req.user.userId);
    }
    
    // Check if customer exists and user has access
    const existingCustomer = await pool.query(
      `SELECT id FROM customers ${whereClause}`,
      params
    );
    
    if (existingCustomer.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı veya erişim yetkiniz yok',
        error: 'Customer not found or access denied'
      });
      return;
    }
    
    // Update customer
    const updatedCustomer = await pool.query(
      `UPDATE customers SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        customer_type = COALESCE($5, customer_type),
        budget_min = COALESCE($6, budget_min),
        budget_max = COALESCE($7, budget_max)
      WHERE id = $8 RETURNING *`,
      [
        updateData.first_name,
        updateData.last_name,
        updateData.email,
        updateData.phone,
        updateData.customer_type,
        updateData.budget_min,
        updateData.budget_max,
        id
      ]
    );
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla güncellendi',
      data: updatedCustomer.rows[0]
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Müşteriyi sil (soft delete)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Müşteri ID (UUID)
 *     responses:
 *       200:
 *         description: Müşteri başarıyla silindi
 *       404:
 *         description: Müşteri bulunamadı
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // YETKİ KONTROLÜ: Admin tüm müşterileri silebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status = $2';
    let params = [id, 'active'];
    
    if (req.user && req.user.role !== 'admin') {
      whereClause += ' AND assigned_agent_id = $3';
      params.push(req.user.userId);
    }
    
    // Check if customer exists and user has access
    const existingCustomer = await pool.query(
      `SELECT id FROM customers ${whereClause}`,
      params
    );
    
    if (existingCustomer.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı veya erişim yetkiniz yok',
        error: 'Customer not found or access denied'
      });
      return;
    }
    
    // Soft delete (status = inactive)
    await pool.query(
      'UPDATE customers SET status = $1 WHERE id = $2',
      ['inactive', id]
    );
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};
