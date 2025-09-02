import { Request, Response } from 'express';
import pool from '../config/database';
import { IProperty, IPropertyCreate, IPropertyUpdate, IPaginatedResponse } from '../types';

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Tüm ilanları listele
 *     tags: [Properties]
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
 *         name: property_type
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, land, commercial]
 *         description: İlan tipi
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, sold, rented, inactive]
 *         description: İlan durumu
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Şehir
 *     responses:
 *       200:
 *         description: İlan listesi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme gerekli
 */
export const getAllProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 10;
    const search = req.query['search'] as string;
    const propertyType = req.query['property_type'] as string;
    const status = req.query['status'] as string;
    const city = req.query['city'] as string;
    
    const offset = (page - 1) * limit;
    
    // YETKİ KONTROLÜ: Admin tüm ilanları görebilir, agent sadece kendininkileri
    let whereClause = 'WHERE p.status != $1';
    let params = ['deleted'];
    let paramCount = 1;
    
    // Eğer admin değilse, sadece kendi ilanlarını göster
    if (req.user && req.user.role !== 'admin') {
      paramCount++;
      whereClause += ` AND p.listed_by_agent_id = $${paramCount}`;
      params.push(req.user.userId);
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
    
    const response: IPaginatedResponse<IProperty> = {
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
    
    res.json(response);
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: ID ile ilan getir
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: İlan ID (UUID)
 *     responses:
 *       200:
 *         description: İlan başarıyla getirildi
 *       404:
 *         description: İlan bulunamadı
 */
export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
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
    
    if (req.user && req.user.role !== 'admin') {
      query += ' AND p.listed_by_agent_id = $3';
      params.push(req.user.userId);
    }
    
    const property = await pool.query(query, params);
    
    if (property.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'İlan bulunamadı',
        error: 'Property not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'İlan başarıyla getirildi',
      data: property.rows[0]
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Yeni ilan oluştur
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: İlan başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 */
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyData: IPropertyCreate = req.body;
    
    // Validation
    if (!propertyData.title || !propertyData.price || !propertyData.property_type) {
      res.status(400).json({
        success: false,
        message: 'Başlık, fiyat ve ilan tipi zorunludur',
        error: 'Missing required fields'
      });
      return;
    }
    
    // YETKİ KONTROLÜ: Admin tüm agent'lara ilan atayabilir, agent sadece kendine
    let listedByAgentId = propertyData.listed_by_agent_id;
    if (req.user && req.user.role !== 'admin') {
      listedByAgentId = req.user.userId;
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
    
    res.status(201).json({
      success: true,
      message: 'İlan başarıyla oluşturuldu',
      data: newProperty.rows[0]
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: İlan bilgilerini güncelle
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: İlan ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: İlan başarıyla güncellendi
 *       404:
 *         description: İlan bulunamadı
 */
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: IPropertyUpdate = req.body;
    
    // YETKİ KONTROLÜ: Admin tüm ilanları güncelleyebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status != $2';
    let params = [id, 'deleted'];
    
    if (req.user && req.user.role !== 'admin') {
      whereClause += ' AND listed_by_agent_id = $3';
      params.push(req.user.userId);
    }
    
    // Check if property exists and user has access
    const existingProperty = await pool.query(
      `SELECT id FROM properties ${whereClause}`,
      params
    );
    
    if (existingProperty.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'İlan bulunamadı veya erişim yetkiniz yok',
        error: 'Property not found or access denied'
      });
      return;
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
    
    res.json({
      success: true,
      message: 'İlan başarıyla güncellendi',
      data: updatedProperty.rows[0]
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: İlanı sil (soft delete)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: İlan ID (UUID)
 *     responses:
 *       200:
 *         description: İlan başarıyla silindi
 *       404:
 *         description: İlan bulunamadı
 */
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // YETKİ KONTROLÜ: Admin tüm ilanları silebilir, agent sadece kendininkileri
    let whereClause = 'WHERE id = $1 AND status != $2';
    let params = [id, 'deleted'];
    
    if (req.user && req.user.role !== 'admin') {
      whereClause += ' AND listed_by_agent_id = $3';
      params.push(req.user.userId);
    }
    
    // Check if property exists and user has access
    const existingProperty = await pool.query(
      `SELECT id FROM properties ${whereClause}`,
      params
    );
    
    if (existingProperty.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'İlan bulunamadı veya erişim yetkiniz yok',
        error: 'Property not found or access denied'
      });
      return;
    }
    
    // Soft delete (status = deleted)
    await pool.query(
      'UPDATE properties SET status = $1 WHERE id = $2',
      ['deleted', id]
    );
    
    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: 'Internal server error'
    });
  }
};


