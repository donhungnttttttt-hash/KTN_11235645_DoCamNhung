-- Add an explicit Tablet classification without reclassifying any existing device.
ALTER TABLE device_assets DROP CHECK ck_asset_type,
 ADD CONSTRAINT ck_asset_type CHECK (type IN ('IPAD','IPHONE','ANDROID','TABLET','OTHER'));
