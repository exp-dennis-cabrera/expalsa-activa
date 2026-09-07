ALTER TABLE parts ADD COLUMN erp_sku VARCHAR(100);
CREATE UNIQUE INDEX idx_parts_erp_sku ON parts(erp_sku) WHERE erp_sku IS NOT NULL;
