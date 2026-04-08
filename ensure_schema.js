const conn = require('./conn');
const bcrypt = require('bcryptjs');

async function hasColumn(tableName, columnName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  return rows[0].total > 0;
}

async function tableExists(tableName) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [tableName]
  );
  return rows[0].total > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName))) {
    console.warn(`[SCHEMA] Table "${tableName}" does not exist. Skipping column "${columnName}" addition.`);
    return;
  }

  if (await hasColumn(tableName, columnName)) {
    return;
  }

  await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureContactMessageColumns() {
  await addColumnIfMissing('contact_messages', 'user_id', 'INT NULL AFTER id');
  await addColumnIfMissing('contact_messages', 'is_read', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER message');
  await addColumnIfMissing('contact_messages', 'read_at', 'TIMESTAMP NULL DEFAULT NULL AFTER is_read');
  await addColumnIfMissing('contact_messages', 'admin_reply', 'TEXT NULL AFTER read_at');
  await addColumnIfMissing('contact_messages', 'replied_at', 'TIMESTAMP NULL DEFAULT NULL AFTER admin_reply');
  await addColumnIfMissing('contact_messages', 'replied_by', 'INT NULL AFTER replied_at');
}

async function ensureNotificationColumns() {
  await addColumnIfMissing('notifications', 'link_url', 'VARCHAR(255) NULL AFTER type');
  await addColumnIfMissing('notifications', 'source_type', 'VARCHAR(50) NULL AFTER link_url');
  await addColumnIfMissing('notifications', 'source_id', 'INT NULL AFTER source_type');
  await addColumnIfMissing('notifications', 'read_at', 'TIMESTAMP NULL DEFAULT NULL AFTER is_read');
}

async function ensureVehicleColumns() {
  await addColumnIfMissing('vehicles', 'city', 'VARCHAR(50) NOT NULL DEFAULT "Pune" AFTER brand');
  await addColumnIfMissing('vehicles', 'partner_id', 'INT NULL AFTER id');
  await addColumnIfMissing('vehicles', 'approval_status', "ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER status");
}

async function ensurePasswordResetColumns() {
  await addColumnIfMissing('users', 'reset_token', 'VARCHAR(255) NULL AFTER password');
  await addColumnIfMissing('users', 'reset_token_expires_at', 'DATETIME NULL AFTER reset_token');
}

async function ensureVehicleReviewsTable() {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS vehicle_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL UNIQUE,
      user_id INT NOT NULL,
      vehicle_id INT NOT NULL,
      rating DECIMAL(2, 1) NOT NULL,
      review_text TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_vehicle_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      CONSTRAINT fk_vehicle_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_vehicle_reviews_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
  `);
}

async function ensureNewsletterTable() {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT TRUE,
      subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureBookingPaymentColumns() {
  await addColumnIfMissing(
    'bookings',
    'payment_method',
    "VARCHAR(40) NOT NULL DEFAULT 'pickup_cash' AFTER status"
  );
  await addColumnIfMissing(
    'bookings',
    'payment_status',
    "VARCHAR(40) NOT NULL DEFAULT 'pending' AFTER payment_method"
  );
  await addColumnIfMissing(
    'bookings',
    'payment_reference',
    'VARCHAR(255) NULL AFTER payment_status'
  );
  await addColumnIfMissing(
    'bookings',
    'razorpay_order_id',
    'VARCHAR(100) NULL AFTER payment_reference'
  );
  await addColumnIfMissing(
    'bookings',
    'partner_status',
    "ENUM('pending', 'accepted', 'rejected') DEFAULT 'accepted' AFTER status"
  );
}

async function ensureAdminUser() {
  const username = 'admin';
  const plainPassword = 'admin123';
  const email = 'admin@rentalbike.com';

  const [[existing]] = await conn.query('SELECT id FROM admins WHERE username = ? LIMIT 1', [username]);

  if (!existing) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await conn.query('INSERT INTO admins (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email]);
    console.log('Default admin user created.');
  } else {
    // Optionally update email if it doesn't match, but DO NOT reset password
    await conn.query('UPDATE admins SET email = ? WHERE id = ? AND (email IS NULL OR email = "")', [email, existing.id]);
  }
}

async function ensurePartnerApplicationsTable() {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS partner_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      business_type VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT,
      status ENUM('pending', 'approved', 'rejected', 'docs_requested', 'docs_submitted') DEFAULT 'pending',
      business_documents TEXT, -- JSON mapping of document types to paths
      business_details TEXT,   -- JSON for shop details, bank info, etc.
      admin_remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_partner_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function ensureAppSettingsTable() {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const defaults = {
    app_name: 'Rental Bike',
    support_email: 'support@rentalbike.com',
    tax_rate: '10',
    currency: 'INR (₹)'
  };

  for (const [key, value] of Object.entries(defaults)) {
    await conn.query(
      `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)`,
      [key, value]
    );
  }
}

async function ensurePaymentsTable() {
  await conn.query(`
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
      CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);
}

async function ensurePartnerApplicationColumns() {
  await addColumnIfMissing('partner_applications', 'identity_proof_type', 'VARCHAR(50) NULL AFTER address');
  await addColumnIfMissing('partner_applications', 'identity_proof_number', 'VARCHAR(50) NULL AFTER identity_proof_type');
  await addColumnIfMissing('partner_applications', 'identity_proof_file', 'VARCHAR(255) NULL AFTER identity_proof_number');
  await addColumnIfMissing('partner_applications', 'address_proof_type', 'VARCHAR(50) NULL AFTER identity_proof_file');
  await addColumnIfMissing('partner_applications', 'address_proof_file', 'VARCHAR(255) NULL AFTER address_proof_type');
  await addColumnIfMissing('partner_applications', 'business_address_proof_type', 'VARCHAR(50) NULL AFTER address_proof_file');
  await addColumnIfMissing('partner_applications', 'business_address_proof_file', 'VARCHAR(255) NULL AFTER business_address_proof_type');
  await addColumnIfMissing('partner_applications', 'num_employees', 'INT NULL AFTER business_address_proof_file');
  await addColumnIfMissing('partner_applications', 'nature_of_work', 'TEXT NULL AFTER num_employees');
  await addColumnIfMissing('partner_applications', 'owner_photo', 'VARCHAR(255) NULL AFTER nature_of_work');
  await addColumnIfMissing('partner_applications', 'partnership_deed', 'VARCHAR(255) NULL AFTER owner_photo');
  await addColumnIfMissing('partner_applications', 'incorporation_cert', 'VARCHAR(255) NULL AFTER partnership_deed');
  await addColumnIfMissing('partner_applications', 'gst_reg', 'VARCHAR(255) NULL AFTER incorporation_cert');
  await addColumnIfMissing('partner_applications', 'bank_name', 'VARCHAR(100) NULL AFTER gst_reg');
  await addColumnIfMissing('partner_applications', 'account_no', 'VARCHAR(50) NULL AFTER bank_name');
  await addColumnIfMissing('partner_applications', 'ifsc_code', 'VARCHAR(20) NULL AFTER account_no');
  await addColumnIfMissing('partner_applications', 'account_holder', 'VARCHAR(100) NULL AFTER ifsc_code');
}

async function ensureSchema() {
  await ensureContactMessageColumns();
  await ensureNotificationColumns();
  await ensureVehicleColumns();
  await ensurePasswordResetColumns();
  await ensureVehicleReviewsTable();
  await ensureNewsletterTable();
  await ensureBookingPaymentColumns();
  await ensureAppSettingsTable();
  await ensurePartnerApplicationsTable();
  await ensurePaymentsTable();
  await ensurePartnerApplicationColumns();
  await ensureAdminUser();
}

module.exports = ensureSchema;
