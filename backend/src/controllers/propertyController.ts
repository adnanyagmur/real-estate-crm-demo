import { Request, Response } from 'express';
import { PropertyService } from '../services/propertyService';
import { IPropertyCreate, IPropertyUpdate } from '../types';

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
    
    const response = await PropertyService.getAllProperties(
      page,
      limit,
      search,
      propertyType,
      status,
      city,
      req.user?.userId,
      req.user?.role
    );
    
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'İlan ID gerekli',
        error: 'Property ID required'
      });
      return;
    }
    
    const property = await PropertyService.getPropertyById(
      id,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'İlan başarıyla getirildi',
      data: property
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    
    if (error instanceof Error && error.message === 'İlan bulunamadı') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Property not found'
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
    
    const newProperty = await PropertyService.createProperty(
      propertyData,
      req.user?.userId,
      req.user?.role
    );
    
    res.status(201).json({
      success: true,
      message: 'İlan başarıyla oluşturuldu',
      data: newProperty
    });
  } catch (error) {
    console.error('Create property error:', error);
    
    if (error instanceof Error && error.message === 'Başlık, fiyat ve ilan tipi zorunludur') {
      res.status(400).json({
        success: false,
        message: error.message,
        error: 'Missing required fields'
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'İlan ID gerekli',
        error: 'Property ID required'
      });
      return;
    }
    
    const updatedProperty = await PropertyService.updateProperty(
      id,
      updateData,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'İlan başarıyla güncellendi',
      data: updatedProperty
    });
  } catch (error) {
    console.error('Update property error:', error);
    
    if (error instanceof Error && error.message === 'İlan bulunamadı veya erişim yetkiniz yok') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Property not found or access denied'
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'İlan ID gerekli',
        error: 'Property ID required'
      });
      return;
    }
    
    await PropertyService.deleteProperty(
      id,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'İlan başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    
    if (error instanceof Error && error.message === 'İlan bulunamadı veya erişim yetkiniz yok') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Property not found or access denied'
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



