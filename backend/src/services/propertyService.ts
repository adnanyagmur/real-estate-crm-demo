import pool from '../config/database';
import { IProperty, IPropertyCreate, IPropertyUpdate, IPaginatedResponse } from '../types';

export class PropertyService {
  /**
   * Tüm ilanları listele (sayfalama ile)
   */
  static async getAllProperties(
    page: number = 1,
    limit: number = 10,
    search?: string,
    propertyType?: string,
    status?: string,
    city?: string,
    userId?: string,
    userRole?: string
  ): Promise<IPaginatedResponse<IProperty>> {
    const offset = (page - 1) * limit;
    
    // YETKİ KONTROLÜ: Admin tüm ilanları görebilir, agent sadece kendininkileri
    let whereClause = 'WHERE p.status != $1';
    let params = ['deleted'];
    let paramCount = 1;
    
    // Eğer admin değilse, sadece kendi ilanlarını göster
    if (userRole !== 'admin' && userId) {
      paramCount++;
      whereClause += ` AND p.listed_by_agent_id = $${paramCount}`;
      params.push(userId);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.address ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (propertyType) {
      paramCount++;
      whereClause += ` AND p.property_type = $${paramCount}`;
      params.push(propertyType);
    }
    
    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }
    
    if (city) {
      paramCount++;
      whereClause += ` AND p.city ILIKE $${paramCount}`;
      params.push(`%${city}%`);
    }
    
    // Get total count with JOIN
    const countQuery = `
      SELECT COUNT(*) FROM properties p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Get properties with pagination and JOIN
    paramCount++;
    const propertiesQuery = `
      SELECT 
        p.*,
        u.username as agent_username,
        u.first_name as agent_first_name,
        u.last_name as agent_last_name,
        c.first_name as owner_first_name,
        c.last_name as owner_last_name,
        c.email as owner_email
      FROM properties p
      JOIN users u ON p.listed_by_agent_id = u.id
      LEFT JOIN customers c ON p.owner_customer_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    const propertiesResult = await pool.query(propertiesQuery, [...params, limit, offset]);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      message: 'İlanlar başarıyla getirildi',
      data: propertiesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * ID ile ilan getir
   */
  static async getPropertyById(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<IProperty> {
    // YETKİ KONTROLÜ: Admin tüm ilanları görebilir, agent sadece kendininkileri
    let query = `
      SELECT 
        p.*,
        u.username as agent_username,
        u.first_name as agent_first_name,
        u.last_name as agent_last_name,
        c.first_name as owner_first_name,
        c.last_name as owner_last_name,
        c.email as owner_email
      FROM properties p
      JOIN users u ON p.listed_by_agent_id = u.id
      LEFT JOIN customers c ON p.owner_customer_id = c.id
      WHERE p.id = $1 AND p.status != $2
    `;
    let params = [id, 'deleted'];
    
    if (userRole !== 'admin' && userId) {
      query += ' AND p.listed_by_agent_id = $3';
      params.push(userId);
    }
    
    const property = await pool.query(query, params);
    
    if (property.rows.length === 0) {
      throw new Error('İlan bulunamadı');
    }
    
    return property.rows[0];
  }

  /**
   * Yeni ilan oluştur
   */
  static async createProperty(
    propertyData: IPropertyCreate,
    userId?: string,
    userRole?: string
  ): Promise<IProperty> {
    // Validation
    if (!propertyData.title || !propertyData.price || !propertyData.property_type) {
      throw new Error('Başlık, fiyat ve ilan tipi zorunludur');
    }
    
    // YETKİ KONTROLÜ: Admin tüm agent'lara ilan atayabilir, agent sadece kendine
    let listedByAgentId = propertyData.listed_by_agent_id;
    if (userRole !== 'admin' && userId) {
      listedByAgentId = userId;
    }
    
    // Create property
    const newProperty = await pool.query(
      `INSERT INTO properties (
        title, description, property_type, status, price, bedrooms, 
        bathrooms, area_sqm, address, city, district, listed_by_agent_id, 
        owner_customer_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        propertyData.title,
        propertyData.description || null,
        propertyData.property_type,
        'active',
        propertyData.price,
        propertyData.bedrooms || null,
        propertyData.bathrooms || null,
        propertyData.area_sqm || null,
        propertyData.address || null,
        propertyData.city || null,
        propertyData.district || null,
        listedByAgentId,
        propertyData.owner_customer_id || null
      ]
    );
    
    return newProperty.rows[0];
  }

  /**
   * İlan bilgilerini güncelle
   */
  static async updateProperty(
    id: string,
    updateData: IPropertyUpdate,
    userId?: string,
    userRole?: string
  ): Promise<IProperty> {
    // YETKİ KONTROLÜ: Admin tüm ilanları güncelleyebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status != $2';
    let params = [id, 'deleted'];
    
    if (userRole !== 'admin' && userId) {
      whereClause += ' AND listed_by_agent_id = $3';
      params.push(userId);
    }
    
    // Check if property exists and user has access
    const existingProperty = await pool.query(
      `SELECT id FROM properties ${whereClause}`,
      params
    );
    
    if (existingProperty.rows.length === 0) {
      throw new Error('İlan bulunamadı veya erişim yetkiniz yok');
    }
    
    // Update property
    const updatedProperty = await pool.query(
      `UPDATE properties SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        property_type = COALESCE($3, property_type),
        status = COALESCE($4, status),
        price = COALESCE($5, price),
        bedrooms = COALESCE($6, bedrooms),
        bathrooms = COALESCE($7, bathrooms),
        area_sqm = COALESCE($8, area_sqm),
        address = COALESCE($9, address),
        city = COALESCE($10, city),
        district = COALESCE($11, district),
        owner_customer_id = COALESCE($12, owner_customer_id),
        sold_to_customer_id = COALESCE($13, sold_to_customer_id)
      WHERE id = $14 RETURNING *`,
      [
        updateData.title,
        updateData.description,
        updateData.property_type,
        updateData.status,
        updateData.price,
        updateData.bedrooms,
        updateData.bathrooms,
        updateData.area_sqm,
        updateData.address,
        updateData.city,
        updateData.district,
        updateData.owner_customer_id,
        updateData.sold_to_customer_id,
        id
      ]
    );
    
    return updatedProperty.rows[0];
  }

  /**
   * İlanı sil (soft delete)
   */
  static async deleteProperty(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<void> {
    // YETKİ KONTROLÜ: Admin tüm ilanları silebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status != $2';
    let params = [id, 'deleted'];
    
    if (userRole !== 'admin' && userId) {
      whereClause += ' AND listed_by_agent_id = $3';
      params.push(userId);
    }
    
    // Check if property exists and user has access
    const existingProperty = await pool.query(
      `SELECT id FROM properties ${whereClause}`,
      params
    );
    
    if (existingProperty.rows.length === 0) {
      throw new Error('İlan bulunamadı veya erişim yetkiniz yok');
    }
    
    // Soft delete (status = deleted)
    await pool.query(
      'UPDATE properties SET status = $1 WHERE id = $2',
      ['deleted', id]
    );
  }
}
