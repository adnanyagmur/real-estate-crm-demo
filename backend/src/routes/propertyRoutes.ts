import { Router } from 'express';
import { 
  getAllProperties, 
  getPropertyById, 
  createProperty, 
  updateProperty, 
  deleteProperty 
} from '../controllers/propertyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: İlan yönetimi işlemleri
 */

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
router.get('/', authenticateToken, getAllProperties);

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
router.get('/:id', authenticateToken, getPropertyById);

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
router.post('/', authenticateToken, createProperty);

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
router.put('/:id', authenticateToken, updateProperty);

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
router.delete('/:id', authenticateToken, deleteProperty);

export default router;


