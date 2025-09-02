-- ========================================
-- UUID MIGRATION SCRIPT
-- ========================================

-- PostgreSQL'de UUID extension'ı aktif et
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. MEVCUT TABLOLARI TEMİZLE
-- ========================================
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ========================================
-- 2. UUID İLE YENİ TABLOLAR OLUŞTUR
-- ========================================

-- USERS TABLOSU (UUID ile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- CUSTOMERS TABLOSU (UUID ile)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    
    -- İLİŞKİ: Hangi agent'ın müşterisi (UUID)
    assigned_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- UNIQUE: Her agent'ın aynı email'de sadece 1 müşterisi olabilir
    UNIQUE(assigned_agent_id, email)
);

-- PROPERTIES TABLOSU (UUID ile)
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    
    -- İLİŞKİ: Hangi agent'ın ilanı (UUID)
    listed_by_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- İLİŞKİ: Hangi müşterinin mülkü (seller ise) (UUID)
    owner_customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    
    -- İLİŞKİ: Hangi müşteriye satıldı/kiraya verildi (buyer ise) (UUID)
    sold_to_customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT
);

-- ========================================
-- 3. INDEX'LER (UUID için optimize edilmiş)
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
-- 4. TRIGGER'LAR (updated_at otomatik güncelleme)
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
-- 5. DUMMY DATA (UUID ile)
-- ========================================

-- Admin user (UUID ile)
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role) VALUES
(uuid_generate_v4(), 'admin', 'admin@emlakcrm.com', '$2b$10$dummy_hash_admin', 'Admin', 'User', 'admin');

-- Agent users (UUID ile)
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role) VALUES
(uuid_generate_v4(), 'agent1', 'agent1@emlakcrm.com', '$2b$10$dummy_hash_agent1', 'Ahmet', 'Yılmaz', 'agent'),
(uuid_generate_v4(), 'agent2', 'agent2@emlakcrm.com', '$2b$10$dummy_hash_agent2', 'Ayşe', 'Demir', 'agent');

-- Agent ID'lerini al
DO $$
DECLARE
    admin_id UUID;
    agent1_id UUID;
    agent2_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE username = 'admin';
    SELECT id INTO agent1_id FROM users WHERE username = 'agent1';
    SELECT id INTO agent2_id FROM users WHERE username = 'agent2';
    
    -- Customers (her agent'ın kendi müşterileri)
    INSERT INTO customers (first_name, last_name, email, phone, customer_type, budget_min, budget_max, assigned_agent_id) VALUES
    -- Agent1'in müşterileri
    ('Mehmet', 'Kaya', 'mehmet@email.com', '0532 123 4567', 'buyer', 300000.00, 500000.00, agent1_id),
    ('Fatma', 'Özkan', 'fatma@email.com', '0533 234 5678', 'seller', NULL, NULL, agent1_id),
    ('Ali', 'Çelik', 'ali@email.com', '0534 345 6789', 'both', 200000.00, 400000.00, agent1_id),
    
    -- Agent2'in müşterileri
    ('Zeynep', 'Arslan', 'zeynep@email.com', '0535 456 7890', 'both', 400000.00, 600000.00, agent2_id),
    ('Mustafa', 'Koç', 'mustafa@email.com', '0536 567 8901', 'buyer', 250000.00, 450000.00, agent2_id);
    
    -- Customer ID'lerini al
    DECLARE
        customer1_id UUID;
        customer2_id UUID;
        customer4_id UUID;
    BEGIN
        SELECT id INTO customer1_id FROM customers WHERE email = 'mehmet@email.com';
        SELECT id INTO customer2_id FROM customers WHERE email = 'fatma@email.com';
        SELECT id INTO customer4_id FROM customers WHERE email = 'zeynep@email.com';
        
        -- Properties (her agent'ın kendi ilanları)
        INSERT INTO properties (title, description, property_type, status, price, bedrooms, bathrooms, area_sqm, address, city, district, listed_by_agent_id, owner_customer_id) VALUES
        -- Agent1'in ilanları
        ('Merkezi Konumda 2+1 Daire', 'Şehir merkezinde, ulaşım kolay', 'apartment', 'active', 450000.00, 2, 1, 85.5, 'Merkez Mah. Ana Cadde No:123', 'İstanbul', 'Kadıköy', agent1_id, customer2_id),
        ('Bahçeli Müstakil Ev', 'Geniş bahçe, 3+1', 'house', 'active', 850000.00, 3, 2, 180.0, 'Yeşil Mah. Çiçek Sok. No:45', 'İzmir', 'Karşıyaka', agent1_id, customer2_id),
        
        -- Agent2'in ilanları
        ('Lüks Villa', 'Deniz manzaralı, havuzlu', 'villa', 'active', 2500000.00, 4, 3, 350.0, 'Sahil Mah. Deniz Cad. No:67', 'Antalya', 'Kemer', agent2_id, customer4_id),
        ('Ticari Dükkan', 'Ana caddede, işlek lokasyon', 'commercial', 'active', 1200000.00, NULL, 1, 120.0, 'Ticaret Mah. İşlek Cad. No:89', 'Ankara', 'Çankaya', agent2_id, customer4_id);
    END;
END $$;

-- ========================================
-- 6. YETKİ KONTROLÜ VIEW'LARI
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
-- 7. YETKİ KONTROLÜ FONKSİYONLARI
-- ========================================

-- Bir agent'ın belirli bir müşteriye erişim yetkisi var mı?
CREATE OR REPLACE FUNCTION can_agent_access_customer(agent_id UUID, customer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM customers 
        WHERE id = customer_id AND assigned_agent_id = agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- Bir agent'ın belirli bir ilana erişim yetkisi var mı?
CREATE OR REPLACE FUNCTION can_agent_access_property(agent_id UUID, property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM properties 
        WHERE id = property_id AND listed_by_agent_id = agent_id
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. YETKİ KONTROLÜ TRIGGER'LARI
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
-- 9. TEST SORGULARI
-- ========================================

-- Agent1'in müşterileri
-- SELECT * FROM agent_customers WHERE agent_username = 'agent1';

-- Agent1'in ilanları
-- SELECT * FROM agent_properties WHERE agent_username = 'agent1';

-- Yetki kontrolü
-- SELECT can_agent_access_customer('agent1_uuid_here', 'customer1_uuid_here');

-- ========================================
-- NOTLAR:
-- ========================================
-- 1. UUID'ler tahmin edilemez ve güvenli
-- 2. Her agent sadece kendi müşterilerini görebilir
-- 3. Her agent sadece kendi ilanlarını görebilir
-- 4. Admin tüm verilere erişebilir
-- 5. Foreign key'ler veri bütünlüğünü korur
-- 6. View'lar ve fonksiyonlar yetki kontrolünü kolaylaştırır
-- 7. UUID ile business intelligence gizlenir


