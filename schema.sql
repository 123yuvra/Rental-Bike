-- Create Database
CREATE DATABASE IF NOT EXISTS rental_bike;
USE rental_bike;

-- Drop tables for clean start
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS vehicle_reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_code VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires_at DATETIME,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    dl_front VARCHAR(255),
    dl_back VARCHAR(255),
    aadhar_card VARCHAR(255),
    kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partner_id INT NULL,
    vehicle_code VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    city VARCHAR(50) DEFAULT 'Pune',
    category ENUM('bike', 'car', 'cycle', 'scooter') NOT NULL,
    type VARCHAR(50), -- e.g., 'Sport Bike', 'Sedan'
    transmission VARCHAR(50), -- e.g., 'Manual', 'Automatic'
    description TEXT,
    price_per_day DECIMAL(10, 2) NOT NULL,
    hourly_rate DECIMAL(10, 2),
    status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    rating DECIMAL(2, 1) DEFAULT 0.0,
    image_url VARCHAR(255),
    features TEXT, -- JSON string or comma separated
    specs TEXT, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_code VARCHAR(20) UNIQUE,
    user_id INT,
    vehicle_id INT,
    pickup_date DATETIME,
    return_date DATETIME,
    base_amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    addons TEXT,
    emergency_contact VARCHAR(20),
    dl_front VARCHAR(255),
    dl_back VARCHAR(255),
    id_proof VARCHAR(255),
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    partner_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'accepted',
    payment_method VARCHAR(40) NOT NULL DEFAULT 'pickup_cash',
    payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(255) NULL,
    razorpay_order_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

-- Vehicle Reviews Table
CREATE TABLE IF NOT EXISTS vehicle_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    rating DECIMAL(2, 1) NOT NULL,
    review_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Admin Users (Simple implementation for now)
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    admin_reply TEXT,
    replied_at TIMESTAMP NULL DEFAULT NULL,
    replied_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (replied_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
    link_url VARCHAR(255),
    source_type VARCHAR(50),
    source_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Partner Applications Table
CREATE TABLE IF NOT EXISTS partner_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    identity_proof_type VARCHAR(50),
    identity_proof_number VARCHAR(50),
    identity_proof_file VARCHAR(255),
    address_proof_type VARCHAR(50),
    address_proof_file VARCHAR(255),
    business_address_proof_type VARCHAR(50),
    business_address_proof_file VARCHAR(255),
    num_employees INT,
    nature_of_work TEXT,
    owner_photo VARCHAR(255),
    partnership_deed VARCHAR(255),
    incorporation_cert VARCHAR(255),
    gst_reg VARCHAR(255),
    bank_name VARCHAR(100),
    account_no VARCHAR(50),
    ifsc_code VARCHAR(20),
    account_holder VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected', 'docs_requested', 'docs_submitted') DEFAULT 'pending',
    business_documents TEXT, -- JSON mapping of document types to paths
    business_details TEXT,   -- JSON for shop details, bank info, etc.
    admin_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payments Table (Tracking partner payouts)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    partner_id INT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    system_commission DECIMAL(10, 2) NOT NULL,
    partner_share DECIMAL(10, 2) NOT NULL,
    payout_status ENUM('pending', 'paid') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
