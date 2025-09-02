import { Request, Response } from 'express';
import { CustomerService } from '../services/customerService';
import { ICustomerCreate, ICustomerUpdate } from '../types';

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
    
    const response = await CustomerService.getAllCustomers(
      page,
      limit,
      search,
      customerType,
      req.user?.userId,
      req.user?.role
    );
    
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Müşteri ID gerekli',
        error: 'Customer ID required'
      });
      return;
    }
    
    const customer = await CustomerService.getCustomerById(
      id,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla getirildi',
      data: customer
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    
    if (error instanceof Error && error.message === 'Müşteri bulunamadı') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Customer not found'
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
    
    const newCustomer = await CustomerService.createCustomer(
      customerData,
      req.user?.userId,
      req.user?.role
    );
    
    res.status(201).json({
      success: true,
      message: 'Müşteri başarıyla oluşturuldu',
      data: newCustomer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Ad, soyad ve email zorunludur') {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'Missing required fields'
        });
        return;
      }
      
      if (error.message === 'Bu email adresi zaten kullanımda') {
        res.status(409).json({
          success: false,
          message: error.message,
          error: 'Email already exists'
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Müşteri ID gerekli',
        error: 'Customer ID required'
      });
      return;
    }
    
    const updatedCustomer = await CustomerService.updateCustomer(
      id,
      updateData,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla güncellendi',
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    
    if (error instanceof Error && error.message === 'Müşteri bulunamadı veya erişim yetkiniz yok') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Customer not found or access denied'
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
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Müşteri ID gerekli',
        error: 'Customer ID required'
      });
      return;
    }
    
    await CustomerService.deleteCustomer(
      id,
      req.user?.userId,
      req.user?.role
    );
    
    res.json({
      success: true,
      message: 'Müşteri başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    
    if (error instanceof Error && error.message === 'Müşteri bulunamadı veya erişim yetkiniz yok') {
      res.status(404).json({
        success: false,
        message: error.message,
        error: 'Customer not found or access denied'
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
