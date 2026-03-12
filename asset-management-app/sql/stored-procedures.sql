-- ============================================================================
-- Asset Management Application - MySQL Stored Procedures
-- Database: asset_mgmt | MySQL 8.0
-- Consolidated: 18 stored procedures (down from 65)
-- Simple CRUD operations moved to direct SQL queries in the service layer.
-- ============================================================================
-- IMPORTANT: Tables must already exist. This file only creates stored procedures.
-- ============================================================================

USE asset_mgmt;
ALTER DATABASE asset_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix updated_at columns: Prisma created them without defaults.
ALTER TABLE assets MODIFY updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE licenses MODIFY updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE services MODIFY updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE assignments MODIFY updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
ALTER TABLE users MODIFY updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Add serial_no column if it doesn't already exist (MySQL 8.0 compatible)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'serial_no');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assets ADD COLUMN serial_no VARCHAR(191) NULL AFTER name', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- Multi-Location Access Control Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO locations (name, code) VALUES
  ('Balasore Plant', 'BAL'),
  ('Kolkata Head Office', 'KOL'),
  ('Sukinda Plant', 'SUK'),
  ('Kaliapani Mines', 'KAL');

CREATE TABLE IF NOT EXISTS user_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_id INT NOT NULL,
  UNIQUE KEY uq_user_location (user_id, location_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add location_id to assets if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'location_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assets ADD COLUMN location_id INT NULL AFTER location', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location_id to assignments if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'location_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assignments ADD COLUMN location_id INT NULL AFTER designation', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add po_number column to assets if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'po_number');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assets ADD COLUMN po_number VARCHAR(100) NULL AFTER location', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location column to assignments if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'location');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assignments ADD COLUMN location VARCHAR(255) NULL AFTER emp_email', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add designation column to assignments if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'asset_mgmt' AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'designation');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE assignments ADD COLUMN designation VARCHAR(255) NULL AFTER location', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(20) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- Clean up all old sp_ prefixed procedures
-- ============================================================================
DROP PROCEDURE IF EXISTS sp_list_assets;
DROP PROCEDURE IF EXISTS sp_get_asset;
DROP PROCEDURE IF EXISTS sp_create_asset;
DROP PROCEDURE IF EXISTS sp_update_asset;
DROP PROCEDURE IF EXISTS sp_delete_asset;
DROP PROCEDURE IF EXISTS sp_get_low_stock_assets;
DROP PROCEDURE IF EXISTS sp_list_licenses;
DROP PROCEDURE IF EXISTS sp_get_license;
DROP PROCEDURE IF EXISTS sp_create_license;
DROP PROCEDURE IF EXISTS sp_update_license;
DROP PROCEDURE IF EXISTS sp_delete_license;
DROP PROCEDURE IF EXISTS sp_get_expiring_licenses;
DROP PROCEDURE IF EXISTS sp_list_services;
DROP PROCEDURE IF EXISTS sp_get_service;
DROP PROCEDURE IF EXISTS sp_create_service;
DROP PROCEDURE IF EXISTS sp_update_service;
DROP PROCEDURE IF EXISTS sp_delete_service;
DROP PROCEDURE IF EXISTS sp_get_cost_summary;
DROP PROCEDURE IF EXISTS sp_get_expiring_services;
DROP PROCEDURE IF EXISTS sp_list_assignments;
DROP PROCEDURE IF EXISTS sp_get_assignment;
DROP PROCEDURE IF EXISTS sp_create_assignment;
DROP PROCEDURE IF EXISTS sp_remove_assignment;
DROP PROCEDURE IF EXISTS sp_list_users;
DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_get_user_by_email;
DROP PROCEDURE IF EXISTS sp_get_user_by_employee_id;
DROP PROCEDURE IF EXISTS sp_create_user;
DROP PROCEDURE IF EXISTS sp_update_user;
DROP PROCEDURE IF EXISTS sp_deactivate_user;
DROP PROCEDURE IF EXISTS sp_reset_password;
DROP PROCEDURE IF EXISTS sp_update_last_login;
DROP PROCEDURE IF EXISTS sp_dashboard_summary;
DROP PROCEDURE IF EXISTS sp_asset_utilization;
DROP PROCEDURE IF EXISTS sp_license_utilization;
DROP PROCEDURE IF EXISTS sp_service_cost_breakdown;
DROP PROCEDURE IF EXISTS sp_employee_summary;
DROP PROCEDURE IF EXISTS sp_upcoming_renewals;
DROP PROCEDURE IF EXISTS sp_create_audit_log;
DROP PROCEDURE IF EXISTS sp_list_audit_logs;
DROP PROCEDURE IF EXISTS sp_get_entity_history;
DROP PROCEDURE IF EXISTS sp_create_email_log;
DROP PROCEDURE IF EXISTS sp_get_admin_emails;
DROP PROCEDURE IF EXISTS sp_get_low_stock_items;
DROP PROCEDURE IF EXISTS sp_list_ewaste;
DROP PROCEDURE IF EXISTS sp_get_ewaste;
DROP PROCEDURE IF EXISTS sp_create_ewaste;
DROP PROCEDURE IF EXISTS sp_update_ewaste;
DROP PROCEDURE IF EXISTS sp_delete_ewaste;
DROP PROCEDURE IF EXISTS sp_add_ewaste_photo;
DROP PROCEDURE IF EXISTS sp_delete_ewaste_photo;
DROP PROCEDURE IF EXISTS sp_list_server_backups;
DROP PROCEDURE IF EXISTS sp_get_server_backup;
DROP PROCEDURE IF EXISTS sp_create_server_backup;
DROP PROCEDURE IF EXISTS sp_update_server_backup;
DROP PROCEDURE IF EXISTS sp_delete_server_backup;
DROP PROCEDURE IF EXISTS sp_list_db_backups;
DROP PROCEDURE IF EXISTS sp_get_db_backup;
DROP PROCEDURE IF EXISTS sp_create_db_backup;
DROP PROCEDURE IF EXISTS sp_update_db_backup;
DROP PROCEDURE IF EXISTS sp_delete_db_backup;
DROP PROCEDURE IF EXISTS sp_list_employee_backups;
DROP PROCEDURE IF EXISTS sp_get_employee_backup;
DROP PROCEDURE IF EXISTS sp_create_employee_backup;
DROP PROCEDURE IF EXISTS sp_update_employee_backup;
DROP PROCEDURE IF EXISTS sp_delete_employee_backup;


-- ============================================================================
-- 1. asset_list — Paginated, filtered, searchable, sortable asset listing
-- ============================================================================
DROP PROCEDURE IF EXISTS asset_list;
DELIMITER $$
CREATE PROCEDURE asset_list(
    IN p_category VARCHAR(500),
    IN p_search VARCHAR(255),
    IN p_stock_status VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_direction VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_direction = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'name'       THEN 'name'
        WHEN 'category'   THEN 'category'
        WHEN 'quantity'   THEN 'quantity'
        WHEN 'available'  THEN 'available'
        WHEN 'price'      THEN 'price'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM assets WHERE is_deleted = 0',
        IF(p_category IS NOT NULL AND p_category != '', CONCAT(' AND FIND_IN_SET(category, ', QUOTE(p_category), ')'), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR location LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        CASE
            WHEN p_stock_status = 'out_of_stock' THEN ' AND available = 0'
            WHEN p_stock_status = 'low_stock'    THEN ' AND available > 0 AND available <= 5'
            WHEN p_stock_status = 'in_stock'     THEN ' AND available > 5'
            ELSE ''
        END,
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM assets WHERE is_deleted = 0',
        IF(p_category IS NOT NULL AND p_category != '', CONCAT(' AND FIND_IN_SET(category, ', QUOTE(p_category), ')'), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR location LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        CASE
            WHEN p_stock_status = 'out_of_stock' THEN ' AND available = 0'
            WHEN p_stock_status = 'low_stock'    THEN ' AND available > 0 AND available <= 5'
            WHEN p_stock_status = 'in_stock'     THEN ' AND available > 5'
            ELSE ''
        END
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 2. license_list
-- ============================================================================
DROP PROCEDURE IF EXISTS license_list;
DELIMITER $$
CREATE PROCEDURE license_list(
    IN p_search VARCHAR(255),
    IN p_vendor VARCHAR(255),
    IN p_status VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_direction VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_direction = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'name'       THEN 'name'
        WHEN 'quantity'   THEN 'quantity'
        WHEN 'available'  THEN 'available'
        WHEN 'end_date'   THEN 'end_date'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM licenses WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_vendor IS NOT NULL AND p_vendor != '', CONCAT(' AND vendor = ', QUOTE(p_vendor)), ''),
        CASE
            WHEN p_status = 'expired'  THEN ' AND end_date < CURDATE()'
            WHEN p_status = 'expiring' THEN ' AND end_date >= CURDATE() AND end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            WHEN p_status = 'active'   THEN ' AND end_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            ELSE ''
        END,
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM licenses WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_vendor IS NOT NULL AND p_vendor != '', CONCAT(' AND vendor = ', QUOTE(p_vendor)), ''),
        CASE
            WHEN p_status = 'expired'  THEN ' AND end_date < CURDATE()'
            WHEN p_status = 'expiring' THEN ' AND end_date >= CURDATE() AND end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            WHEN p_status = 'active'   THEN ' AND end_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            ELSE ''
        END
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 3. service_list
-- ============================================================================
DROP PROCEDURE IF EXISTS service_list;
DELIMITER $$
CREATE PROCEDURE service_list(
    IN p_type VARCHAR(50),
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_direction VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_direction = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'name'       THEN 'name'
        WHEN 'type'       THEN 'type'
        WHEN 'cost'       THEN 'cost'
        WHEN 'end_date'   THEN 'end_date'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM services WHERE is_deleted = 0',
        IF(p_type IS NOT NULL AND p_type != '', CONCAT(' AND type = ', QUOTE(p_type)), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR provider LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        CASE
            WHEN p_status = 'Active'     THEN ' AND status = ''Active'' AND (end_date IS NULL OR end_date >= CURDATE())'
            WHEN p_status = 'Pending'    THEN ' AND status = ''Pending'''
            WHEN p_status = 'Cancelled'  THEN ' AND status = ''Cancelled'''
            WHEN p_status = 'Expired'    THEN ' AND end_date < CURDATE() AND status != ''Cancelled'''
            WHEN p_status = 'RenewalDue' THEN ' AND status = ''Active'' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            ELSE ''
        END,
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM services WHERE is_deleted = 0',
        IF(p_type IS NOT NULL AND p_type != '', CONCAT(' AND type = ', QUOTE(p_type)), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR provider LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        CASE
            WHEN p_status = 'Active'     THEN ' AND status = ''Active'' AND (end_date IS NULL OR end_date >= CURDATE())'
            WHEN p_status = 'Pending'    THEN ' AND status = ''Pending'''
            WHEN p_status = 'Cancelled'  THEN ' AND status = ''Cancelled'''
            WHEN p_status = 'Expired'    THEN ' AND end_date < CURDATE() AND status != ''Cancelled'''
            WHEN p_status = 'RenewalDue' THEN ' AND status = ''Active'' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
            ELSE ''
        END
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 4. service_cost_breakdown — 2 result sets: by-type breakdown + totals
-- ============================================================================
DROP PROCEDURE IF EXISTS service_cost_breakdown;
DELIMITER $$
CREATE PROCEDURE service_cost_breakdown()
BEGIN
    SELECT type, COUNT(*) AS service_count,
        ROUND(SUM(CASE billing_cycle WHEN 'Monthly' THEN cost WHEN 'Quarterly' THEN cost/3 WHEN 'Yearly' THEN cost/12 WHEN 'OneTime' THEN 0 ELSE 0 END), 2) AS monthly_cost,
        ROUND(SUM(CASE billing_cycle WHEN 'Monthly' THEN cost*12 WHEN 'Quarterly' THEN cost*4 WHEN 'Yearly' THEN cost WHEN 'OneTime' THEN cost ELSE 0 END), 2) AS yearly_cost
    FROM services WHERE is_deleted = 0 AND status != 'Cancelled'
    GROUP BY type ORDER BY yearly_cost DESC;

    SELECT COUNT(*) AS total_services,
        ROUND(SUM(CASE billing_cycle WHEN 'Monthly' THEN cost WHEN 'Quarterly' THEN cost/3 WHEN 'Yearly' THEN cost/12 WHEN 'OneTime' THEN 0 ELSE 0 END), 2) AS total_monthly,
        ROUND(SUM(CASE billing_cycle WHEN 'Monthly' THEN cost*12 WHEN 'Quarterly' THEN cost*4 WHEN 'Yearly' THEN cost WHEN 'OneTime' THEN cost ELSE 0 END), 2) AS total_yearly
    FROM services WHERE is_deleted = 0 AND status != 'Cancelled';
END$$
DELIMITER ;


-- ============================================================================
-- 5. assignment_list
-- ============================================================================
DROP PROCEDURE IF EXISTS assignment_list;
DELIMITER $$
CREATE PROCEDURE assignment_list(
    IN p_search VARCHAR(255),
    IN p_department VARCHAR(255),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(64);
    DECLARE v_sort_direction VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_direction = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'emp_name'    THEN 'a.emp_name'
        WHEN 'emp_id'      THEN 'a.emp_id'
        WHEN 'department'  THEN 'd.name'
        WHEN 'assign_date' THEN 'a.assign_date'
        WHEN 'created_at'  THEN 'a.created_at'
        ELSE 'a.created_at'
    END;

    SET @sql = CONCAT(
        'SELECT a.*, d.name AS department_name, a.location, a.designation,',
        ' (SELECT COUNT(*) FROM assignment_assets aa WHERE aa.assignment_id = a.id) AS asset_count,',
        ' (SELECT COUNT(*) FROM assignment_licenses al WHERE al.assignment_id = a.id) AS license_count',
        ' FROM assignments a LEFT JOIN departments d ON a.department_id = d.id',
        ' WHERE a.is_active = 1',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (a.emp_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_id LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_email LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_department IS NOT NULL AND p_department != '', CONCAT(' AND d.name = ', QUOTE(p_department)), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM assignments a LEFT JOIN departments d ON a.department_id = d.id WHERE a.is_active = 1',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (a.emp_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_id LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_email LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_department IS NOT NULL AND p_department != '', CONCAT(' AND d.name = ', QUOTE(p_department)), '')
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 6. assignment_get
-- ============================================================================
DROP PROCEDURE IF EXISTS assignment_get;
DELIMITER $$
CREATE PROCEDURE assignment_get(IN p_id INT)
BEGIN
    SELECT a.*, d.name AS department_name
    FROM assignments a LEFT JOIN departments d ON a.department_id = d.id
    WHERE a.id = p_id AND a.is_active = 1;
END$$
DELIMITER ;


-- ============================================================================
-- 7. assignment_create — TRANSACTIONAL
-- ============================================================================
DROP PROCEDURE IF EXISTS assignment_create;
DELIMITER $$
CREATE PROCEDURE assignment_create(
    IN p_emp_name VARCHAR(255),
    IN p_emp_id VARCHAR(100),
    IN p_department_name VARCHAR(255),
    IN p_emp_email VARCHAR(255),
    IN p_location VARCHAR(255),
    IN p_designation VARCHAR(255),
    IN p_assign_date DATETIME,
    IN p_notes TEXT,
    IN p_created_by INT,
    IN p_asset_ids TEXT,
    IN p_license_ids TEXT
)
BEGIN
    DECLARE v_dept_id INT DEFAULT NULL;
    DECLARE v_assignment_id INT;
    DECLARE v_asset_id INT;
    DECLARE v_license_id INT;
    DECLARE v_available INT;
    DECLARE v_remaining TEXT;
    DECLARE v_token VARCHAR(20);
    DECLARE v_comma_pos INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

    START TRANSACTION;

    IF p_department_name IS NOT NULL AND p_department_name != '' THEN
        SELECT id INTO v_dept_id FROM departments WHERE name = p_department_name LIMIT 1;
        IF v_dept_id IS NULL THEN
            INSERT INTO departments (name) VALUES (p_department_name);
            SET v_dept_id = LAST_INSERT_ID();
        END IF;
    END IF;

    INSERT INTO assignments (emp_name, emp_id, department_id, emp_email, location, designation, assign_date, notes, is_active, created_by)
    VALUES (p_emp_name, p_emp_id, v_dept_id, p_emp_email, NULLIF(p_location, ''), NULLIF(p_designation, ''), IFNULL(p_assign_date, NOW()), p_notes, 1, p_created_by);
    SET v_assignment_id = LAST_INSERT_ID();

    IF p_asset_ids IS NOT NULL AND p_asset_ids != '' THEN
        SET v_remaining = p_asset_ids;
        asset_loop: WHILE LENGTH(v_remaining) > 0 DO
            SET v_comma_pos = LOCATE(',', v_remaining);
            IF v_comma_pos > 0 THEN
                SET v_token = TRIM(SUBSTRING(v_remaining, 1, v_comma_pos - 1));
                SET v_remaining = SUBSTRING(v_remaining, v_comma_pos + 1);
            ELSE
                SET v_token = TRIM(v_remaining);
                SET v_remaining = '';
            END IF;
            IF v_token = '' THEN ITERATE asset_loop; END IF;
            SET v_asset_id = CAST(v_token AS UNSIGNED);
            SELECT available INTO v_available FROM assets WHERE id = v_asset_id AND is_deleted = 0 FOR UPDATE;
            IF v_available IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asset not found or deleted'; END IF;
            IF v_available <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available stock for this asset'; END IF;
            UPDATE assets SET assigned = assigned + 1, available = available - 1 WHERE id = v_asset_id;
            INSERT INTO assignment_assets (assignment_id, asset_id, quantity) VALUES (v_assignment_id, v_asset_id, 1);
        END WHILE asset_loop;
    END IF;

    IF p_license_ids IS NOT NULL AND p_license_ids != '' THEN
        SET v_remaining = p_license_ids;
        license_loop: WHILE LENGTH(v_remaining) > 0 DO
            SET v_comma_pos = LOCATE(',', v_remaining);
            IF v_comma_pos > 0 THEN
                SET v_token = TRIM(SUBSTRING(v_remaining, 1, v_comma_pos - 1));
                SET v_remaining = SUBSTRING(v_remaining, v_comma_pos + 1);
            ELSE
                SET v_token = TRIM(v_remaining);
                SET v_remaining = '';
            END IF;
            IF v_token = '' THEN ITERATE license_loop; END IF;
            SET v_license_id = CAST(v_token AS UNSIGNED);
            SELECT available INTO v_available FROM licenses WHERE id = v_license_id AND is_deleted = 0 FOR UPDATE;
            IF v_available IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'License not found or deleted'; END IF;
            IF v_available <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available seats for this license'; END IF;
            UPDATE licenses SET used = used + 1, available = available - 1 WHERE id = v_license_id;
            INSERT INTO assignment_licenses (assignment_id, license_id, quantity) VALUES (v_assignment_id, v_license_id, 1);
        END WHILE license_loop;
    END IF;

    COMMIT;

    SELECT a.*, d.name AS department_name
    FROM assignments a LEFT JOIN departments d ON a.department_id = d.id
    WHERE a.id = v_assignment_id;
END$$
DELIMITER ;


-- ============================================================================
-- 8. assignment_remove — TRANSACTIONAL
-- ============================================================================
DROP PROCEDURE IF EXISTS assignment_remove;
DELIMITER $$
CREATE PROCEDURE assignment_remove(IN p_id INT)
BEGIN
    DECLARE v_exists INT;
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_asset_id INT;
    DECLARE v_asset_qty INT;
    DECLARE v_license_id INT;
    DECLARE v_license_qty INT;

    DECLARE cur_assets CURSOR FOR SELECT asset_id, quantity FROM assignment_assets WHERE assignment_id = p_id;
    DECLARE cur_licenses CURSOR FOR SELECT license_id, quantity FROM assignment_licenses WHERE assignment_id = p_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_exists FROM assignments WHERE id = p_id AND is_active = 1;
    IF v_exists = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Assignment not found or already inactive'; END IF;

    OPEN cur_assets;
    asset_loop: LOOP
        FETCH cur_assets INTO v_asset_id, v_asset_qty;
        IF v_done THEN LEAVE asset_loop; END IF;
        UPDATE assets SET assigned = assigned - v_asset_qty, available = available + v_asset_qty WHERE id = v_asset_id;
    END LOOP asset_loop;
    CLOSE cur_assets;
    SET v_done = 0;

    OPEN cur_licenses;
    license_loop: LOOP
        FETCH cur_licenses INTO v_license_id, v_license_qty;
        IF v_done THEN LEAVE license_loop; END IF;
        UPDATE licenses SET used = used - v_license_qty, available = available + v_license_qty WHERE id = v_license_id;
    END LOOP license_loop;
    CLOSE cur_licenses;

    UPDATE assignments SET is_active = 0 WHERE id = p_id;
    COMMIT;

    SELECT p_id AS id, 'Assignment removed successfully' AS message;
END$$
DELIMITER ;


-- ============================================================================
-- 9. user_list
-- ============================================================================
DROP PROCEDURE IF EXISTS user_list;
DELIMITER $$
CREATE PROCEDURE user_list(
    IN p_search VARCHAR(255),
    IN p_role VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_direction VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_direction = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'full_name'  THEN 'full_name'
        WHEN 'email'      THEN 'email'
        WHEN 'role'       THEN 'role'
        WHEN 'is_active'  THEN 'is_active'
        WHEN 'last_login' THEN 'last_login'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT id, employee_id, email, full_name, role, is_active, last_login, created_at, updated_at',
        ' FROM users WHERE 1=1',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (full_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR email LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR employee_id LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_role IS NOT NULL AND p_role != '', CONCAT(' AND role = ', QUOTE(p_role)), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM users WHERE 1=1',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (full_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR email LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR employee_id LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_role IS NOT NULL AND p_role != '', CONCAT(' AND role = ', QUOTE(p_role)), '')
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 10. user_create — Handles duplicate email/employeeId
-- ============================================================================
DROP PROCEDURE IF EXISTS user_create;
DELIMITER $$
CREATE PROCEDURE user_create(
    IN p_employee_id VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_password_hash VARCHAR(255),
    IN p_full_name VARCHAR(255),
    IN p_role VARCHAR(20)
)
BEGIN
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email or Employee ID already exists';
    END;

    INSERT INTO users (employee_id, email, password_hash, full_name, role, is_active)
    VALUES (p_employee_id, p_email, p_password_hash, p_full_name, IFNULL(p_role, 'viewer'), 1);

    SELECT id, employee_id, email, full_name, role, is_active, last_login, created_at, updated_at
    FROM users WHERE id = LAST_INSERT_ID();
END$$
DELIMITER ;


-- ============================================================================
-- 11. user_update — Handles duplicate email/employeeId
-- ============================================================================
DROP PROCEDURE IF EXISTS user_update;
DELIMITER $$
CREATE PROCEDURE user_update(
    IN p_id INT,
    IN p_full_name VARCHAR(255),
    IN p_employee_id VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_role VARCHAR(20),
    IN p_is_active BOOLEAN
)
BEGIN
    DECLARE v_exists INT;

    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email or Employee ID already exists';
    END;

    SELECT COUNT(*) INTO v_exists FROM users WHERE id = p_id;
    IF v_exists = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found'; END IF;

    UPDATE users SET
        full_name   = COALESCE(p_full_name, full_name),
        employee_id = COALESCE(p_employee_id, employee_id),
        email       = COALESCE(p_email, email),
        role        = COALESCE(p_role, role),
        is_active   = COALESCE(p_is_active, is_active)
    WHERE id = p_id;

    SELECT id, employee_id, email, full_name, role, is_active, last_login, created_at, updated_at
    FROM users WHERE id = p_id;
END$$
DELIMITER ;


-- ============================================================================
-- 12. audit_list
-- ============================================================================
DROP PROCEDURE IF EXISTS audit_list;
DELIMITER $$
CREATE PROCEDURE audit_list(
    IN p_action VARCHAR(20),
    IN p_entity_type VARCHAR(50),
    IN p_user_id INT,
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;

    SET @sql = CONCAT(
        'SELECT al.*, u.full_name, u.email, u.role',
        ' FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1',
        IF(p_action IS NOT NULL AND p_action != '', CONCAT(' AND al.action = ', QUOTE(p_action)), ''),
        IF(p_entity_type IS NOT NULL AND p_entity_type != '', CONCAT(' AND al.entity_type = ', QUOTE(p_entity_type)), ''),
        IF(p_user_id IS NOT NULL, CONCAT(' AND al.user_id = ', CAST(p_user_id AS CHAR)), ''),
        IF(p_start_date IS NOT NULL, CONCAT(' AND al.created_at >= ', QUOTE(p_start_date)), ''),
        IF(p_end_date IS NOT NULL, CONCAT(' AND al.created_at <= ', QUOTE(p_end_date)), ''),
        ' ORDER BY al.created_at DESC',
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM audit_log al WHERE 1=1',
        IF(p_action IS NOT NULL AND p_action != '', CONCAT(' AND al.action = ', QUOTE(p_action)), ''),
        IF(p_entity_type IS NOT NULL AND p_entity_type != '', CONCAT(' AND al.entity_type = ', QUOTE(p_entity_type)), ''),
        IF(p_user_id IS NOT NULL, CONCAT(' AND al.user_id = ', CAST(p_user_id AS CHAR)), ''),
        IF(p_start_date IS NOT NULL, CONCAT(' AND al.created_at >= ', QUOTE(p_start_date)), ''),
        IF(p_end_date IS NOT NULL, CONCAT(' AND al.created_at <= ', QUOTE(p_end_date)), '')
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 13. report_dashboard_summary — 4 result sets
-- ============================================================================
DROP PROCEDURE IF EXISTS report_dashboard_summary;
DELIMITER $$
CREATE PROCEDURE report_dashboard_summary()
BEGIN
    SELECT
        (SELECT IFNULL(SUM(quantity), 0) FROM assets WHERE is_deleted = 0) AS total_assets,
        (SELECT IFNULL(SUM(assigned), 0) FROM assets WHERE is_deleted = 0) AS assigned_assets,
        (SELECT IFNULL(SUM(quantity), 0) FROM licenses WHERE is_deleted = 0) AS total_licenses,
        (SELECT IFNULL(SUM(available), 0) FROM licenses WHERE is_deleted = 0) AS available_licenses,
        (SELECT COUNT(*) FROM services WHERE is_deleted = 0 AND status = 'Active' AND (end_date IS NULL OR end_date >= CURDATE())) AS active_services,
        (SELECT ROUND(IFNULL(SUM(CASE billing_cycle WHEN 'Monthly' THEN cost WHEN 'Quarterly' THEN cost/3 WHEN 'Yearly' THEN cost/12 WHEN 'OneTime' THEN 0 ELSE 0 END), 0), 2) FROM services WHERE is_deleted = 0 AND status != 'Cancelled') AS monthly_cost,
        (SELECT COUNT(*) FROM assignments WHERE is_active = 1) AS employees_with_assets,
        ((SELECT COUNT(*) FROM licenses WHERE is_deleted = 0 AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY))
         + (SELECT COUNT(*) FROM services WHERE is_deleted = 0 AND status = 'Active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY))) AS renewals_due;

    SELECT a.*, d.name AS department_name,
        (SELECT COUNT(*) FROM assignment_assets aa WHERE aa.assignment_id = a.id) AS asset_count,
        (SELECT COUNT(*) FROM assignment_licenses al WHERE al.assignment_id = a.id) AS license_count
    FROM assignments a LEFT JOIN departments d ON a.department_id = d.id
    WHERE a.is_active = 1 ORDER BY a.created_at DESC LIMIT 5;

    (SELECT 'license' AS item_type, id, name, NULL AS provider, end_date, DATEDIFF(end_date, CURDATE()) AS days_remaining
     FROM licenses WHERE is_deleted = 0 AND end_date >= CURDATE() AND end_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY))
    UNION ALL
    (SELECT 'service' AS item_type, id, name, provider, end_date, DATEDIFF(end_date, CURDATE()) AS days_remaining
     FROM services WHERE is_deleted = 0 AND status = 'Active' AND end_date >= CURDATE() AND end_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY))
    ORDER BY days_remaining ASC LIMIT 5;

    (SELECT 'asset' AS item_type, id, name, category AS sub_type, quantity AS total, available
     FROM assets WHERE is_deleted = 0 AND available <= 5)
    UNION ALL
    (SELECT 'license' AS item_type, id, name, NULL AS sub_type, quantity AS total, available
     FROM licenses WHERE is_deleted = 0 AND available <= 5)
    ORDER BY available ASC LIMIT 5;
END$$
DELIMITER ;


-- ============================================================================
-- 14. ewaste_list
-- ============================================================================
DROP PROCEDURE IF EXISTS ewaste_list;
DELIMITER $$
CREATE PROCEDURE ewaste_list(
    IN p_search VARCHAR(255),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_dir VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_dir = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'title' THEN 'title'
        WHEN 'billing_number' THEN 'billing_number'
        WHEN 'disposal_date' THEN 'disposal_date'
        WHEN 'disposal_cost' THEN 'disposal_cost'
        WHEN 'disposed_to' THEN 'disposed_to'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT e.*, (SELECT COUNT(*) FROM ewaste_photos ep WHERE ep.ewaste_id = e.id) AS photo_count',
        ' FROM ewaste e WHERE e.is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (e.title LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR e.billing_number LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR e.disposed_to LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR JSON_SEARCH(e.asset_names, ''one'', ', QUOTE(CONCAT('%', p_search, '%')), ') IS NOT NULL)'), ''),
        ' ORDER BY e.', v_sort_col, ' ', v_sort_dir,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @cnt = CONCAT(
        'SELECT COUNT(*) AS total FROM ewaste e WHERE e.is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (e.title LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR e.billing_number LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR e.disposed_to LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR JSON_SEARCH(e.asset_names, ''one'', ', QUOTE(CONCAT('%', p_search, '%')), ') IS NOT NULL)'), '')
    );
    PREPARE stmt FROM @cnt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 15. ewaste_get — 2 result sets (record + photos)
-- ============================================================================
DROP PROCEDURE IF EXISTS ewaste_get;
DELIMITER $$
CREATE PROCEDURE ewaste_get(IN p_id INT)
BEGIN
    SELECT * FROM ewaste WHERE id = p_id AND is_deleted = 0;
    SELECT * FROM ewaste_photos WHERE ewaste_id = p_id ORDER BY uploaded_at ASC;
END$$
DELIMITER ;


-- ============================================================================
-- 16. server_backup_list
-- ============================================================================
DROP PROCEDURE IF EXISTS server_backup_list;
DELIMITER $$
CREATE PROCEDURE server_backup_list(
    IN p_search VARCHAR(255),
    IN p_backup_type VARCHAR(30),
    IN p_status VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_dir VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_dir = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'server_name' THEN 'server_name'
        WHEN 'backup_type' THEN 'backup_type'
        WHEN 'last_backup_date' THEN 'last_backup_date'
        WHEN 'last_backup_status' THEN 'last_backup_status'
        WHEN 'backup_size_gb' THEN 'backup_size_gb'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM server_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (server_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR server_ip LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR responsible_person LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_backup_type IS NOT NULL AND p_backup_type != '', CONCAT(' AND backup_type = ', QUOTE(p_backup_type)), ''),
        IF(p_status IS NOT NULL AND p_status != '', CONCAT(' AND last_backup_status = ', QUOTE(p_status)), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_dir,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @cnt = CONCAT(
        'SELECT COUNT(*) AS total FROM server_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (server_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR server_ip LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR responsible_person LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_backup_type IS NOT NULL AND p_backup_type != '', CONCAT(' AND backup_type = ', QUOTE(p_backup_type)), ''),
        IF(p_status IS NOT NULL AND p_status != '', CONCAT(' AND last_backup_status = ', QUOTE(p_status)), '')
    );
    PREPARE stmt FROM @cnt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 17. db_backup_list
-- ============================================================================
DROP PROCEDURE IF EXISTS db_backup_list;
DELIMITER $$
CREATE PROCEDURE db_backup_list(
    IN p_search VARCHAR(255),
    IN p_db_engine VARCHAR(30),
    IN p_backup_type VARCHAR(30),
    IN p_status VARCHAR(20),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_dir VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_dir = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'database_name' THEN 'database_name'
        WHEN 'db_engine' THEN 'db_engine'
        WHEN 'last_backup_date' THEN 'last_backup_date'
        WHEN 'last_backup_status' THEN 'last_backup_status'
        WHEN 'backup_size_gb' THEN 'backup_size_gb'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM db_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (database_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR server_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR responsible_person LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_db_engine IS NOT NULL AND p_db_engine != '', CONCAT(' AND db_engine = ', QUOTE(p_db_engine)), ''),
        IF(p_backup_type IS NOT NULL AND p_backup_type != '', CONCAT(' AND backup_type = ', QUOTE(p_backup_type)), ''),
        IF(p_status IS NOT NULL AND p_status != '', CONCAT(' AND last_backup_status = ', QUOTE(p_status)), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_dir,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @cnt = CONCAT(
        'SELECT COUNT(*) AS total FROM db_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (database_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR server_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR responsible_person LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_db_engine IS NOT NULL AND p_db_engine != '', CONCAT(' AND db_engine = ', QUOTE(p_db_engine)), ''),
        IF(p_backup_type IS NOT NULL AND p_backup_type != '', CONCAT(' AND backup_type = ', QUOTE(p_backup_type)), ''),
        IF(p_status IS NOT NULL AND p_status != '', CONCAT(' AND last_backup_status = ', QUOTE(p_status)), '')
    );
    PREPARE stmt FROM @cnt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- 18. employee_backup_list
-- ============================================================================
DROP PROCEDURE IF EXISTS employee_backup_list;
DELIMITER $$
CREATE PROCEDURE employee_backup_list(
    IN p_search VARCHAR(255),
    IN p_sort_field VARCHAR(50),
    IN p_sort_dir VARCHAR(4),
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_sort_col VARCHAR(50);
    DECLARE v_sort_dir VARCHAR(4);

    SET p_page = IFNULL(p_page, 1);
    SET p_limit = IFNULL(p_limit, 20);
    SET v_offset = (p_page - 1) * p_limit;
    SET v_sort_dir = IF(UPPER(IFNULL(p_sort_dir, 'DESC')) = 'ASC', 'ASC', 'DESC');
    SET v_sort_col = CASE IFNULL(p_sort_field, 'created_at')
        WHEN 'sl_no' THEN 'sl_no'
        WHEN 'user_name' THEN 'user_name'
        WHEN 'email_id' THEN 'email_id'
        WHEN 'created_at' THEN 'created_at'
        ELSE 'created_at'
    END;

    SET @sql = CONCAT(
        'SELECT * FROM employee_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (user_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR email_id LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR disk_name LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_dir,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @cnt = CONCAT(
        'SELECT COUNT(*) AS total FROM employee_backups WHERE is_deleted = 0',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (user_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR email_id LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR disk_name LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), '')
    );
    PREPARE stmt FROM @cnt;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$
DELIMITER ;


-- ============================================================================
-- Complete: 18 stored procedures
--
--  1. asset_list              — Dynamic filtered asset listing
--  2. license_list            — Dynamic filtered license listing
--  3. service_list            — Dynamic filtered service listing
--  4. service_cost_breakdown  — 2-result-set billing calculation
--  5. assignment_list         — Dynamic filtered assignment listing
--  6. assignment_get          — Single assignment fetch
--  7. assignment_create       — Transactional assignment creation
--  8. assignment_remove       — Transactional assignment removal
--  9. user_list               — Dynamic filtered user listing
-- 10. user_create             — User creation with duplicate handling
-- 11. user_update             — User update with duplicate handling
-- 12. audit_list              — Dynamic filtered audit log listing
-- 13. report_dashboard_summary — 4-result-set dashboard aggregation
-- 14. ewaste_list             — Dynamic filtered e-waste listing
-- 15. ewaste_get              — E-waste record + photos (2 result sets)
-- 16. server_backup_list      — Dynamic filtered server backup listing
-- 17. db_backup_list          — Dynamic filtered DB backup listing
-- 18. employee_backup_list    — Dynamic filtered employee backup listing
-- ============================================================================
