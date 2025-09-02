import { Router } from 'express';
import { 
  getAllCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Müşteri yönetimi işlemleri
 */

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
router.get('/', authenticateToken, getAllCustomers);

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
 *           type: integer
 *         description: Müşteri ID
 *     responses:
 *       200:
 *         description: Müşteri başarıyla getirildi
 *       404:
 *         description: Müşteri bulunamadı
 */
router.get('/:id', authenticateToken, getCustomerById);

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
router.post('/', authenticateToken, createCustomer);

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
 *           type: integer
 *         description: Müşteri ID
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
router.put('/:id', authenticateToken, updateCustomer);

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
 *           type: integer
 *         description: Müşteri ID
 *     responses:
 *       200:
 *         description: Müşteri başarıyla silindi
 *       404:
 *         description: Müşteri bulunamadı
 */
router.delete('/:id', authenticateToken, deleteCustomer);

export default router;


