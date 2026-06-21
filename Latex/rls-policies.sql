-- =============================================
-- AutoService CRM - Row Level Security Policies
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Все авторизованные пользователи могут читать профили
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Только admin может управлять профилями пользователей
CREATE POLICY "Only admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Manager и Admin могут читать, создавать и обновлять клиентов
CREATE POLICY "Managers and admins can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role IN ('manager', 'technician') AND customers.deleted_at IS NULL)
      )
    )
  );

CREATE POLICY "Managers and admins can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role = 'manager' AND customers.deleted_at IS NULL)
      )
    )
  );

-- Сотрудники могут просматривать автомобили, менеджеры и администраторы - изменять
CREATE POLICY "Staff can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role IN ('manager', 'technician') AND vehicles.deleted_at IS NULL)
      )
    )
  );

CREATE POLICY "Managers and admins can create vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers and admins can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND (
        role = 'admin'
        OR (role = 'manager' AND vehicles.deleted_at IS NULL)
      )
    )
  );

-- Все авторизованные могут читать заявки с ограничениями по роли
CREATE POLICY "Users can view relevant requests"
  ON service_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (
        up.role IN ('admin', 'manager')
        OR (up.role = 'technician' AND service_requests.technician_id = auth.uid())
      )
    )
  );

-- Manager и Admin могут создавать заявки
CREATE POLICY "Managers and admins can create requests"
  ON service_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Manager, назначенный Technician и Admin могут обновлять заявки
CREATE POLICY "Authorized users can update requests"
  ON service_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND (
        up.role = 'admin'
        OR up.role = 'manager'
        OR (up.role = 'technician' AND service_requests.technician_id = auth.uid())
      )
    )
  );

-- Только Admin может удалять заявки
CREATE POLICY "Only admins can delete requests"
  ON service_requests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin видит все логи, Manager - только операционные логи заявок
CREATE POLICY "Admins and managers can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'admin'
          OR (up.role = 'manager' AND audit_logs.entity_type = 'service_request')
        )
    )
  );

-- Логи создаются только через триггеры, пользователям запись запрещена
CREATE POLICY "Audit logs are read-only"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (false);
