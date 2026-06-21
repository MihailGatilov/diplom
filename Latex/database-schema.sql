-- =============================================
-- AutoService CRM - Database Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица профилей пользователей (расширение auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'technician')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Таблица клиентов автосервиса
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  delete_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

-- Таблица автомобилей
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  vin TEXT NOT NULL UNIQUE,
  license_plate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  delete_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at);

-- Таблица заявок на обслуживание
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  manager_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  technician_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')
  ),
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_vehicle_id ON service_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_manager_id ON service_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_technician_id ON service_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);

-- Таблица логов аудита
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('service_request', 'customer', 'vehicle', 'user')),
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'deleted')),
  old_value JSONB,
  new_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Функция логирования изменений заявок
CREATE OR REPLACE FUNCTION public.log_service_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  action_type TEXT;
BEGIN
  current_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      action_type := 'status_changed';
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      entity_type, entity_id, user_id, action, old_value, new_value
    ) VALUES (
      'service_request', OLD.id, current_user_id, action_type, row_to_json(OLD), '{}'::jsonb
    );
    RETURN OLD;
  ELSE
    INSERT INTO public.audit_logs (
      entity_type, entity_id, user_id, action, old_value, new_value
    ) VALUES (
      'service_request',
      NEW.id,
      current_user_id,
      action_type,
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER service_request_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_request_changes();
