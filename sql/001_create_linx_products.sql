CREATE DATABASE LinxCommerceTest;
GO

USE LinxCommerceTest;
GO

IF OBJECT_ID('dbo.linx_products', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.linx_products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    integration_product_id NVARCHAR(150) NOT NULL,
    name NVARCHAR(500) NOT NULL,
    reference_code NVARCHAR(150) NOT NULL,
    definition NVARCHAR(150) NOT NULL,
    brand NVARCHAR(150) NOT NULL,
    main_category NVARCHAR(500) NOT NULL,
    category NVARCHAR(1000) NOT NULL,
    show_on_site BIT NOT NULL DEFAULT 1,
    searchable BIT NOT NULL DEFAULT 1,
    show_price BIT NOT NULL DEFAULT 1,
    show_availability BIT NOT NULL DEFAULT 1,
    show_stock BIT NOT NULL DEFAULT 1,
    short_description NVARCHAR(2000) NULL,
    long_description NVARCHAR(MAX) NULL,
    page_title NVARCHAR(500) NULL,
    slug NVARCHAR(500) NULL,
    meta_description NVARCHAR(2000) NULL,
    search_terms NVARCHAR(MAX) NULL,
    material NVARCHAR(500) NULL,
    warranty NVARCHAR(200) NULL,
    side NVARCHAR(100) NULL,
    product_weight DECIMAL(18,4) NOT NULL DEFAULT 0,
    product_width DECIMAL(18,4) NOT NULL DEFAULT 0,
    product_height DECIMAL(18,4) NOT NULL DEFAULT 0,
    product_length DECIMAL(18,4) NOT NULL DEFAULT 0,
    commercial_code NVARCHAR(1000) NULL,
    voltage NVARCHAR(100) NULL,
    application NVARCHAR(1000) NULL,
    vehicle_model NVARCHAR(1000) NULL,
    compatible_vehicles NVARCHAR(2000) NULL,
    sku_json NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
GO
