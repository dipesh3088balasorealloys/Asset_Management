const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root',
    database: 'asset_mgmt', multipleStatements: true
  });

  // 1. ewaste (bulk disposal model)
  await c.query(`
    CREATE TABLE IF NOT EXISTS ewaste (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      title           VARCHAR(255) NOT NULL,
      billing_number  VARCHAR(100) NULL,
      asset_names     JSON         NULL,
      disposal_date   DATE         NULL,
      disposed_to     VARCHAR(255) NULL,
      disposal_cost   DECIMAL(12,2) NULL DEFAULT 0.00,
      reason          TEXT         NULL,
      remarks         TEXT         NULL,
      is_deleted      TINYINT(1)   NOT NULL DEFAULT 0,
      created_by      INT          NULL,
      created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_ewaste_title (title),
      INDEX idx_ewaste_deleted (is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('1. ewaste table created');

  // 2. ewaste_photos
  await c.query(`
    CREATE TABLE IF NOT EXISTS ewaste_photos (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      ewaste_id     INT          NOT NULL,
      file_path     VARCHAR(500) NOT NULL,
      photo_type    VARCHAR(30)  NOT NULL DEFAULT 'asset',
      original_name VARCHAR(255) NULL,
      uploaded_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_ewaste_photos_ewaste FOREIGN KEY (ewaste_id) REFERENCES ewaste(id) ON DELETE CASCADE,
      INDEX idx_ewaste_photos_ewaste (ewaste_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('2. ewaste_photos table created');

  // 3. server_backups
  await c.query(`
    CREATE TABLE IF NOT EXISTS server_backups (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      server_name        VARCHAR(255) NOT NULL,
      server_ip          VARCHAR(45)  NULL,
      backup_type        VARCHAR(30)  NOT NULL DEFAULT 'Full',
      backup_schedule    VARCHAR(30)  NOT NULL DEFAULT 'Daily',
      storage_location   VARCHAR(50)  NOT NULL DEFAULT 'Local',
      storage_path       VARCHAR(500) NULL,
      last_backup_date   DATETIME     NULL,
      last_backup_status VARCHAR(20)  NOT NULL DEFAULT 'Success',
      backup_size_gb     DECIMAL(10,2) NULL,
      retention_days     INT          NULL,
      responsible_person VARCHAR(255) NULL,
      remarks            TEXT         NULL,
      is_deleted         TINYINT(1)   NOT NULL DEFAULT 0,
      created_by         INT          NULL,
      created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_sb_name (server_name),
      INDEX idx_sb_status (last_backup_status),
      INDEX idx_sb_deleted (is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('3. server_backups table created');

  // 4. db_backups
  await c.query(`
    CREATE TABLE IF NOT EXISTS db_backups (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      database_name      VARCHAR(255) NOT NULL,
      server_name        VARCHAR(255) NULL,
      db_engine          VARCHAR(30)  NOT NULL DEFAULT 'MySQL',
      backup_type        VARCHAR(30)  NOT NULL DEFAULT 'Full',
      backup_schedule    VARCHAR(30)  NOT NULL DEFAULT 'Daily',
      storage_location   VARCHAR(50)  NOT NULL DEFAULT 'Local',
      storage_path       VARCHAR(500) NULL,
      last_backup_date   DATETIME     NULL,
      last_backup_status VARCHAR(20)  NOT NULL DEFAULT 'Success',
      backup_size_gb     DECIMAL(10,2) NULL,
      retention_days     INT          NULL,
      responsible_person VARCHAR(255) NULL,
      remarks            TEXT         NULL,
      is_deleted         TINYINT(1)   NOT NULL DEFAULT 0,
      created_by         INT          NULL,
      created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_db_name (database_name),
      INDEX idx_db_engine (db_engine),
      INDEX idx_db_status (last_backup_status),
      INDEX idx_db_deleted (is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('4. db_backups table created');

  // 5. employee_backups
  await c.query(`
    CREATE TABLE IF NOT EXISTS employee_backups (
      id                     INT AUTO_INCREMENT PRIMARY KEY,
      sl_no                  INT          NULL,
      email_id               VARCHAR(255) NOT NULL,
      user_name              VARCHAR(255) NOT NULL,
      email_backup           TINYINT(1)   NOT NULL DEFAULT 0,
      onedrive_backup        TINYINT(1)   NOT NULL DEFAULT 0,
      desktop_laptop_backup  TINYINT(1)   NOT NULL DEFAULT 0,
      disk_name              VARCHAR(255) NULL,
      remarks                TEXT         NULL,
      is_deleted             TINYINT(1)   NOT NULL DEFAULT 0,
      created_by             INT          NULL,
      created_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      INDEX idx_eb_email (email_id),
      INDEX idx_eb_name (user_name),
      INDEX idx_eb_deleted (is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('5. employee_backups table created');

  console.log('\\nAll 5 tables created successfully!');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
