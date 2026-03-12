// Temporary script to recreate stored procedures with location filtering
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root', password: 'root',
    database: 'asset_mgmt', multipleStatements: false,
  });

  // 1. asset_list
  await conn.query('DROP PROCEDURE IF EXISTS asset_list');
  await conn.query(`
CREATE PROCEDURE asset_list(
    IN p_category VARCHAR(500),
    IN p_search VARCHAR(255),
    IN p_stock_status VARCHAR(20),
    IN p_location_ids VARCHAR(255),
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
        WHEN 'name'       THEN 'a.name'
        WHEN 'category'   THEN 'a.category'
        WHEN 'quantity'   THEN 'a.quantity'
        WHEN 'available'  THEN 'a.available'
        WHEN 'price'      THEN 'a.price'
        WHEN 'created_at' THEN 'a.created_at'
        ELSE 'a.created_at'
    END;

    SET @sql = CONCAT(
        'SELECT a.*, l.name AS location_name, l.code AS location_code FROM assets a',
        ' LEFT JOIN locations l ON a.location_id = l.id',
        ' WHERE a.is_deleted = 0',
        IF(p_category IS NOT NULL AND p_category != '',
            CONCAT(' AND FIND_IN_SET(a.category, ', QUOTE(p_category), ')'), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (a.name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.serial_no LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_stock_status IS NOT NULL AND p_stock_status != '',
            CASE p_stock_status
                WHEN 'out_of_stock' THEN ' AND a.available = 0'
                WHEN 'low_stock'    THEN ' AND a.available > 0 AND a.available <= 5'
                WHEN 'in_stock'     THEN ' AND a.available > 5'
                ELSE ''
            END, ''),
        IF(p_location_ids IS NOT NULL AND p_location_ids != '',
            CONCAT(' AND a.location_id IN (', p_location_ids, ')'), ''),
        ' ORDER BY ', v_sort_col, ' ', v_sort_direction,
        ' LIMIT ', CAST(p_limit AS CHAR), ' OFFSET ', CAST(v_offset AS CHAR)
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @count_sql = CONCAT(
        'SELECT COUNT(*) AS total FROM assets a WHERE a.is_deleted = 0',
        IF(p_category IS NOT NULL AND p_category != '',
            CONCAT(' AND FIND_IN_SET(a.category, ', QUOTE(p_category), ')'), ''),
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (a.name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.vendor LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.serial_no LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_stock_status IS NOT NULL AND p_stock_status != '',
            CASE p_stock_status
                WHEN 'out_of_stock' THEN ' AND a.available = 0'
                WHEN 'low_stock'    THEN ' AND a.available > 0 AND a.available <= 5'
                WHEN 'in_stock'     THEN ' AND a.available > 5'
                ELSE ''
            END, ''),
        IF(p_location_ids IS NOT NULL AND p_location_ids != '',
            CONCAT(' AND a.location_id IN (', p_location_ids, ')'), '')
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END
  `);
  console.log('1/3 asset_list SP recreated');

  // 2. assignment_list
  await conn.query('DROP PROCEDURE IF EXISTS assignment_list');
  await conn.query(`
CREATE PROCEDURE assignment_list(
    IN p_search VARCHAR(255),
    IN p_department VARCHAR(255),
    IN p_location_ids VARCHAR(255),
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
        'SELECT a.*, d.name AS department_name, a.location, a.designation, l.name AS org_location_name,',
        ' (SELECT COUNT(*) FROM assignment_assets aa WHERE aa.assignment_id = a.id) AS asset_count,',
        ' (SELECT COUNT(*) FROM assignment_licenses al WHERE al.assignment_id = a.id) AS license_count',
        ' FROM assignments a LEFT JOIN departments d ON a.department_id = d.id',
        ' LEFT JOIN locations l ON a.location_id = l.id',
        ' WHERE a.is_active = 1',
        IF(p_search IS NOT NULL AND p_search != '',
            CONCAT(' AND (a.emp_name LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_id LIKE ', QUOTE(CONCAT('%', p_search, '%')),
                   ' OR a.emp_email LIKE ', QUOTE(CONCAT('%', p_search, '%')), ')'), ''),
        IF(p_department IS NOT NULL AND p_department != '', CONCAT(' AND d.name = ', QUOTE(p_department)), ''),
        IF(p_location_ids IS NOT NULL AND p_location_ids != '',
            CONCAT(' AND a.location_id IN (', p_location_ids, ')'), ''),
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
        IF(p_department IS NOT NULL AND p_department != '', CONCAT(' AND d.name = ', QUOTE(p_department)), ''),
        IF(p_location_ids IS NOT NULL AND p_location_ids != '',
            CONCAT(' AND a.location_id IN (', p_location_ids, ')'), '')
    );
    PREPARE stmt FROM @count_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END
  `);
  console.log('2/3 assignment_list SP recreated');

  // 3. assignment_create with location_id
  await conn.query('DROP PROCEDURE IF EXISTS assignment_create');
  await conn.query(`
CREATE PROCEDURE assignment_create(
    IN p_emp_name VARCHAR(255),
    IN p_emp_id VARCHAR(100),
    IN p_department_name VARCHAR(255),
    IN p_emp_email VARCHAR(255),
    IN p_location VARCHAR(255),
    IN p_designation VARCHAR(255),
    IN p_location_id INT,
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

    INSERT INTO assignments (emp_name, emp_id, department_id, emp_email, location, designation, location_id, assign_date, notes, is_active, created_by)
    VALUES (p_emp_name, p_emp_id, v_dept_id, p_emp_email, NULLIF(p_location, ''), NULLIF(p_designation, ''), p_location_id, IFNULL(p_assign_date, NOW()), p_notes, 1, p_created_by);
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
END
  `);
  console.log('3/3 assignment_create SP recreated');

  await conn.end();
  console.log('\nAll stored procedures updated with location support!');
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
