-- ========================================
-- VERİTABANI İLİŞKİLERİ VE KISITLAMALAR
-- ========================================

-- Mevcut tabloları temizle (eğer varsa)
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- 1. USERS TABLOSU (Ana tablo)
-- ========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. CUSTOMERS TABLOSU (Users'a bağlı)
-- ========================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    customer_type VARCHAR(20) DEFAULT 'buyer' CHECK (customer_type IN ('buyer', 'seller', 'both')),
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- İLİŞKİ: Hangi agent'ın müşterisi
    assigned_agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- UNIQUE: Her agent'ın aynı email'de sadece 1 müşterisi olabilir
    UNIQUE(assigned_agent_id, email)
);

-- ========================================
-- 3. PROPERTIES TABLOSU (Users ve Customers'a bağlı)
-- ========================================
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('apartment', 'house', 'villa', 'land', 'commercial')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'rented', 'inactive')),
    price DECIMAL(12,2) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqm DECIMAL(8,2),
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- İLİŞKİ: Hangi agent'ın ilanı
    listed_by_agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- İLİŞKİ: Hangi müşterinin mülkü (seller ise)
    owner_customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- İLİŞKİ: Hangi müşteriye satıldı/kiraya verildi (buyer ise)
    sold_to_customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT
);

-- ========================================
-- 4. INDEX'LER (Performans için)
-- ========================================
CREATE INDEX idx_customers_assigned_agent ON customers(assigned_agent_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);

CREATE INDEX idx_properties_listed_by_agent ON properties(listed_by_agent_id);
CREATE INDEX idx_properties_owner_customer ON properties(owner_customer_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_price ON properties(price);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ========================================
-- 5. TRIGGER'LAR (updated_at otomatik güncelleme)
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. DUMMY DATA (İlişkilerle birlikte)
-- ========================================

-- Admin user
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('admin', 'admin@emlakcrm.com', '$2b$10$dummy_hash_admin', 'Admin', 'User', 'admin');

-- Agent users
INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES
('agent1', 'agent1@emlakcrm.com', '$2b$10$dummy_hash_agent1', 'Ahmet', 'Yılmaz', 'agent'),
('agent2', 'agent2@emlakcrm.com', '$2b$10$dummy_hash_agent2', 'Ayşe', 'Demir', 'agent');

-- Customers (her agent'ın kendi müşterileri)
INSERT INTO customers (first_name, last_name, email, phone, customer_type, budget_min, budget_max, assigned_agent_id) VALUES
-- Agent1'in müşterileri
('Mehmet', 'Kaya', 'mehmet@email.com', '0532 123 4567', 'buyer', 300000.00, 500000.00, 2),
('Fatma', 'Özkan', 'fatma@email.com', '0533 234 5678', 'seller', NULL, NULL, 2),
('Ali', 'Çelik', 'ali@email.com', '0534 345 6789', 'both', 200000.00, 400000.00, 2),

-- Agent2'in müşterileri
('Zeynep', 'Arslan', 'zeynep@email.com', '0535 456 7890', 'both', 400000.00, 600000.00, 3),
('Mustafa', 'Koç', 'mustafa@email.com', '0536 567 8901', 'buyer', 250000.00, 450000.00, 3);

-- Properties (her agent'ın kendi ilanları)
INSERT INTO properties (title, description, property_type, status, price, bedrooms, bathrooms, area_sqm, address, city, district, listed_by_agent_id, owner_customer_id) VALUES
-- Agent1'in ilanları
('Merkezi Konumda 2+1 Daire', 'Şehir merkezinde, ulaşım kolay', 'apartment', 'active', 450000.00, 2, 1, 85.5, 'Merkez Mah. Ana Cadde No:123', 'İstanbul', 'Kadıköy', 2, 2),
('Bahçeli Müstakil Ev', 'Geniş bahçe, 3+1', 'house', 'active', 850000.00, 3, 2, 180.0, 'Yeşil Mah. Çiçek Sok. No:45', 'İzmir', 'Karşıyaka', 2, 2),

-- Agent2'in ilanları
('Lüks Villa', 'Deniz manzaralı, havuzlu', 'villa', 'active', 2500000.00, 4, 3, 350.0, 'Sahil Mah. Deniz Cad. No:67', 'Antalya', 'Kemer', 3, 4),
('Ticari Dükkan', 'Ana caddede, işlek lokasyon', 'commercial', 'active', 1200000.00, NULL, 1, 120.0, 'Ticaret Mah. İşlek Cad. No:89', 'Ankara', 'Çankaya', 3, 4);

-- ========================================
-- 7. YETKİ KONTROLÜ VIEW'LARI
-- ========================================

-- Agent'ların sadece kendi müşterilerini görebilmesi için view
CREATE VIEW agent_customers AS
SELECT 
    c.*,
    u.username as agent_username,
    u.first_name as agent_first_name,
    u.last_name as agent_last_name
FROM customers c
JOIN users u ON c.assigned_agent_id = u.id
WHERE u.status = 'active';

-- Agent'ların sadece kendi ilanlarını görebilmesi için view
CREATE VIEW agent_properties AS
SELECT 
    p.*,
    u.username as agent_username,
    u.first_name as agent_first_name,
    u.last_name as agent_last_name,
    c.first_name as owner_first_name,
    c.last_name as owner_last_name
FROM properties p
JOIN users u ON p.listed_by_agent_id = u.id
LEFT JOIN customers c ON p.owner_customer_id = c.id
WHERE u.status = 'active';

-- ========================================
-- 8. YETKİ KONTROLÜ FONKSİYONLARI
-- ========================================

-- Bir agent'ın belirli bir müşteriye erişim yetkisi var mı?
CREATE OR REPLACE FUNCTION can_agent_access_customer(agent_id INTEGER, customer_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM customers 
        WHERE id = customer_id AND assigned_agent_id = agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- Bir agent'ın belirli bir ilana erişim yetkisi var mı?
CREATE OR REPLACE FUNCTION can_agent_access_property(agent_id INTEGER, property_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM properties 
        WHERE id = property_id AND listed_by_agent_id = agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. YETKİ KONTROLÜ TRIGGER'LARI
-- ========================================

-- Müşteri silinmeden önce kontrol (eğer ilanı varsa silinemez)
CREATE OR REPLACE FUNCTION check_customer_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM properties WHERE owner_customer_id = OLD.id OR sold_to_customer_id = OLD.id) THEN
        RAISE EXCEPTION 'Bu müşteri silinemez çünkü ilanları bulunmaktadır';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_customer_deletion
    BEFORE DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION check_customer_deletion();

-- ========================================
-- 10. TEST SORGULARI
-- ========================================

-- Agent1'in müşterileri
-- SELECT * FROM agent_customers WHERE agent_username = 'agent1';

-- Agent1'in ilanları
-- SELECT * FROM agent_properties WHERE agent_username = 'agent1';

-- Yetki kontrolü
-- SELECT can_agent_access_customer(2, 1); -- Agent1, Customer1'e erişebilir mi?
-- SELECT can_agent_access_customer(2, 4); -- Agent1, Customer4'e erişebilir mi? (Hayır!)

-- ========================================
-- NOTLAR:
-- ========================================
-- 1. Her agent sadece kendi müşterilerini görebilir/düzenleyebilir
-- 2. Her agent sadece kendi ilanlarını görebilir/düzenleyebilir
-- 3. Admin tüm verilere erişebilir
-- 4. Müşteri silinmeden önce ilan kontrolü yapılır
-- 5. Foreign key'ler veri bütünlüğünü korur
-- 6. View'lar ve fonksiyonlar yetki kontrolünü kolaylaştırır


