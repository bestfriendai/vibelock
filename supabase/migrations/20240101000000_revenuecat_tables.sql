-- RevenueCat Integration Tables

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'billing_issue', 'paused')),
  entitlements TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  billing_issue_detected_at TIMESTAMP WITH TIME ZONE,
  transaction_id TEXT,
  original_transaction_id TEXT,
  store TEXT CHECK (store IN ('app_store', 'play_store', 'stripe', 'promotional')),
  environment TEXT CHECK (environment IN ('production', 'sandbox')),
  transferred_from UUID,
  transferred_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs table for auditing
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT,
  user_id UUID,
  payload JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase history table
CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  original_transaction_id TEXT,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  price DECIMAL(10, 2),
  currency TEXT,
  store TEXT,
  environment TEXT,
  refunded BOOLEAN DEFAULT FALSE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotional entitlements table
CREATE TABLE IF NOT EXISTS promotional_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  reason TEXT,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_service ON webhook_logs(service);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_transaction_id ON purchase_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_promotional_entitlements_user_id ON promotional_entitlements(user_id);

-- Update profiles table to include subscription status
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies

-- User subscriptions policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Webhook logs policies (only service role)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access webhook logs" ON webhook_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Purchase history policies
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase history" ON purchase_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage purchase history" ON purchase_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Promotional entitlements policies
ALTER TABLE promotional_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promotional entitlements" ON promotional_entitlements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage promotional entitlements" ON promotional_entitlements
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions

-- Function to check if user has active premium
CREATE OR REPLACE FUNCTION is_user_premium(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active_subscription BOOLEAN;
  has_promotional BOOLEAN;
BEGIN
  -- Check active subscriptions
  SELECT EXISTS(
    SELECT 1 FROM user_subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND 'premium' = ANY(entitlements)
  ) INTO has_active_subscription;

  -- Check promotional entitlements
  SELECT EXISTS(
    SELECT 1 FROM promotional_entitlements
    WHERE user_id = user_uuid
    AND revoked = FALSE
    AND starts_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
    AND entitlement = 'premium'
  ) INTO has_promotional;

  RETURN has_active_subscription OR has_promotional;
END;
$$ LANGUAGE plpgsql;

-- Function to get user entitlements
CREATE OR REPLACE FUNCTION get_user_entitlements(user_uuid UUID)
RETURNS TEXT[] AS $$
DECLARE
  subscription_entitlements TEXT[];
  promotional_entitlements_arr TEXT[];
  all_entitlements TEXT[];
BEGIN
  -- Get entitlements from active subscriptions
  SELECT COALESCE(array_agg(DISTINCT unnest(entitlements)), '{}')
  INTO subscription_entitlements
  FROM user_subscriptions
  WHERE user_id = user_uuid
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW());

  -- Get promotional entitlements
  SELECT COALESCE(array_agg(DISTINCT entitlement), '{}')
  INTO promotional_entitlements_arr
  FROM promotional_entitlements
  WHERE user_id = user_uuid
  AND revoked = FALSE
  AND starts_at <= NOW()
  AND (expires_at IS NULL OR expires_at > NOW());

  -- Combine and return unique entitlements
  all_entitlements := array_cat(subscription_entitlements, promotional_entitlements_arr);
  RETURN array(SELECT DISTINCT unnest(all_entitlements));
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile when subscription changes
CREATE OR REPLACE FUNCTION update_profile_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profile based on subscription status
  UPDATE profiles
  SET 
    is_premium = is_user_premium(NEW.user_id),
    subscription_status = NEW.status,
    subscription_expires_at = NEW.expires_at,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS subscription_updated ON user_subscriptions;
CREATE TRIGGER subscription_updated
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_subscription_status();

-- Scheduled function to expire subscriptions (run daily via pg_cron)
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
  -- Mark expired subscriptions
  UPDATE user_subscriptions
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

  -- Update profiles for expired subscriptions
  UPDATE profiles p
  SET 
    is_premium = FALSE,
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE EXISTS (
    SELECT 1 FROM user_subscriptions s
    WHERE s.user_id = p.id
    AND s.status = 'expired'
    AND NOT EXISTS (
      SELECT 1 FROM promotional_entitlements pe
      WHERE pe.user_id = p.id
      AND pe.revoked = FALSE
      AND pe.starts_at <= NOW()
      AND (pe.expires_at IS NULL OR pe.expires_at > NOW())
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant function to add promotional entitlement
CREATE OR REPLACE FUNCTION grant_promotional_entitlement(
  target_user_id UUID,
  entitlement_type TEXT,
  duration_days INTEGER DEFAULT NULL,
  grant_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  IF duration_days IS NOT NULL THEN
    expiry_date := NOW() + (duration_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO promotional_entitlements (
    user_id,
    entitlement,
    granted_by,
    reason,
    expires_at
  ) VALUES (
    target_user_id,
    entitlement_type,
    auth.uid(),
    grant_reason,
    expiry_date
  );

  -- Update profile
  UPDATE profiles
  SET 
    is_premium = TRUE,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;