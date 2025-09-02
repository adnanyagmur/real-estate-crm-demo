import pool from '../config/database';
import { ICustomer, ICustomerCreate, ICustomerUpdate, IPaginatedResponse } from '../types';

export class CustomerService {
  /**
   * Tüm müşterileri listele (sayfalama ile)
   */
  static async getAllCustomers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    customerType?: string,
    userId?: string,
    userRole?: string
  ): Promise<IPaginatedResponse<ICustomer>> {
    const offset = (page - 1) * limit;
    
    // YETKİ KONTROLÜ: Admin tüm müşterileri görebilir, agent sadece kendininkileri
    let whereClause = 'WHERE c.status = $1';
    let params = ['active'];
    let paramCount = 1;
    
    // Eğer admin değilse, sadece kendi müşterilerini göster
    if (userRole !== 'admin' && userId) {
      paramCount++;
      whereClause += ` AND c.assigned_agent_id = $${paramCount}`;
      params.push(userId);
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
    
    return {
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
  }

  /**
   * ID ile müşteri getir
   */
  static async getCustomerById(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<ICustomer> {
    // YETKİ KONTROLÜ: Admin tüm müşterileri görebilir, agent sadece kendininkileri
    let query = `
      SELECT c.*, u.username as agent_username, u.first_name as agent_first_name, u.last_name as agent_last_name
      FROM customers c
      JOIN users u ON c.assigned_agent_id = u.id
      WHERE c.id = $1 AND c.status = $2
    `;
    let params = [id, 'active'];
    
    if (userRole !== 'admin' && userId) {
      query += ' AND c.assigned_agent_id = $3';
      params.push(userId);
    }
    
    const customer = await pool.query(query, params);
    
    if (customer.rows.length === 0) {
      throw new Error('Müşteri bulunamadı');
    }
    
    return customer.rows[0];
  }

  /**
   * Yeni müşteri oluştur
   */
  static async createCustomer(
    customerData: ICustomerCreate,
    userId?: string,
    userRole?: string
  ): Promise<ICustomer> {
    // Validation
    if (!customerData.first_name || !customerData.last_name || !customerData.email) {
      throw new Error('Ad, soyad ve email zorunludur');
    }
    
    // YETKİ KONTROLÜ: Admin tüm agent'lara müşteri atayabilir, agent sadece kendine
    let assignedAgentId = customerData.assigned_agent_id;
    if (userRole !== 'admin' && userId) {
      assignedAgentId = userId;
    }
    
    // Check if email already exists for this agent
    const existingCustomer = await pool.query(
      'SELECT id FROM customers WHERE email = $1 AND assigned_agent_id = $2 AND status = $3',
      [customerData.email, assignedAgentId, 'active']
    );
    
    if (existingCustomer.rows.length > 0) {
      throw new Error('Bu email adresi zaten kullanımda');
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
    
    return newCustomer.rows[0];
  }

  /**
   * Müşteri bilgilerini güncelle
   */
  static async updateCustomer(
    id: string,
    updateData: ICustomerUpdate,
    userId?: string,
    userRole?: string
  ): Promise<ICustomer> {
    // YETKİ KONTROLÜ: Admin tüm müşterileri güncelleyebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status = $2';
    let params = [id, 'active'];
    
    if (userRole !== 'admin' && userId) {
      whereClause += ' AND assigned_agent_id = $3';
      params.push(userId);
    }
    
    // Check if customer exists and user has access
    const existingCustomer = await pool.query(
      `SELECT id FROM customers ${whereClause}`,
      params
    );
    
    if (existingCustomer.rows.length === 0) {
      throw new Error('Müşteri bulunamadı veya erişim yetkiniz yok');
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
    
    return updatedCustomer.rows[0];
  }

  /**
   * Müşteriyi sil (soft delete)
   */
  static async deleteCustomer(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<void> {
    // YETKİ KONTROLÜ: Admin tüm müşterileri silebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status = $2';
    let params = [id, 'active'];
    
    if (userRole !== 'admin' && userId) {
      whereClause += ' AND assigned_agent_id = $3';
      params.push(userId);
    }
    
    // Check if customer exists and user has access
    const existingCustomer = await pool.query(
      `SELECT id FROM customers ${whereClause}`,
      params
    );
    
    if (existingCustomer.rows.length === 0) {
      throw new Error('Müşteri bulunamadı veya erişim yetkiniz yok');
    }
    
    // Soft delete (status = inactive)
    await pool.query(
      'UPDATE customers SET status = $1 WHERE id = $2',
      ['inactive', id]
    );
  }
}
