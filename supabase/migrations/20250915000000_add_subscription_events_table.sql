-- Add subscription events table for monetization analytics
-- This migration adds comprehensive subscription tracking and analytics

-- Create subscription_events table for tracking all subscription-related events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_started',
    'subscription_renewed', 
    'subscription_canceled',
    'subscription_expired',
    'trial_started',
    'trial_converted',
    'purchase_failed',
    'billing_issue',
    'refund_issued'
  )),
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'premium', 'pro')),
  revenuecat_event_id TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Indexes for performance
  CONSTRAINT unique_revenuecat_event UNIQUE (revenuecat_event_id) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for subscription events
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_tier_date ON subscription_events(subscription_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_revenuecat_id ON subscription_events(revenuecat_event_id) WHERE revenuecat_event_id IS NOT NULL;

-- Add RLS policies for subscription events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- System can create subscription events (for webhooks)
CREATE POLICY "System can create subscription events" ON subscription_events
  FOR INSERT WITH CHECK (true);

-- Add subscription analytics view for easy querying
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  event_type,
  subscription_tier,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM subscription_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), event_type, subscription_tier
ORDER BY date DESC, event_type, subscription_tier;

-- Add subscription metrics view for dashboard
CREATE OR REPLACE VIEW subscription_metrics AS
WITH current_subscribers AS (
  SELECT 
    COUNT(*) FILTER (WHERE subscription_tier = 'premium' AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())) as premium_count,
    COUNT(*) FILTER (WHERE subscription_tier = 'pro' AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())) as pro_count,
    COUNT(*) FILTER (WHERE subscription_tier = 'free' OR subscription_expires_at <= NOW()) as free_count,
    COUNT(*) as total_users
  FROM users
),
recent_events AS (
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'subscription_started' AND created_at >= NOW() - INTERVAL '30 days') as new_subscriptions_30d,
    COUNT(*) FILTER (WHERE event_type = 'subscription_canceled' AND created_at >= NOW() - INTERVAL '30 days') as cancellations_30d,
    COUNT(*) FILTER (WHERE event_type = 'purchase_failed' AND created_at >= NOW() - INTERVAL '30 days') as failed_purchases_30d
  FROM subscription_events
)
SELECT 
  cs.premium_count,
  cs.pro_count,
  cs.free_count,
  cs.total_users,
  (cs.premium_count + cs.pro_count) as total_paid_subscribers,
  ROUND((cs.premium_count + cs.pro_count)::numeric / NULLIF(cs.total_users, 0) * 100, 2) as subscription_rate_percent,
  re.new_subscriptions_30d,
  re.cancellations_30d,
  re.failed_purchases_30d,
  CASE 
    WHEN re.new_subscriptions_30d > 0 
    THEN ROUND(re.cancellations_30d::numeric / re.new_subscriptions_30d * 100, 2)
    ELSE 0 
  END as churn_rate_percent
FROM current_subscribers cs, recent_events re;

-- Function to get user subscription status efficiently
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.subscription_tier, 'free') as tier,
    CASE 
      WHEN u.subscription_tier = 'free' THEN false
      WHEN u.subscription_expires_at IS NULL THEN true
      WHEN u.subscription_expires_at > NOW() THEN true
      ELSE false
    END as is_active,
    u.subscription_expires_at as expires_at,
    CASE 
      WHEN u.subscription_expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(days FROM u.subscription_expires_at - NOW())::INTEGER)
    END as days_remaining
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should see ads
CREATE OR REPLACE FUNCTION should_show_ads(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_status RECORD;
BEGIN
  SELECT * INTO user_status FROM get_user_subscription_status(p_user_id);
  
  -- Show ads if user is not premium/pro or subscription is expired
  RETURN NOT (user_status.is_active AND user_status.tier IN ('premium', 'pro'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log subscription events (for application use)
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_subscription_tier TEXT,
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_revenuecat_event_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    user_id,
    event_type,
    subscription_tier,
    event_data,
    revenuecat_event_id
  ) VALUES (
    p_user_id,
    p_event_type,
    p_subscription_tier,
    p_event_data,
    p_revenuecat_event_id
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update user's last_active when subscription events occur
CREATE OR REPLACE FUNCTION update_user_activity_on_subscription_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET last_active = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_activity_on_subscription_event
  AFTER INSERT ON subscription_events
  FOR EACH ROW EXECUTE FUNCTION update_user_activity_on_subscription_event();

-- Add comments for documentation
COMMENT ON TABLE subscription_events IS 'Tracks all subscription-related events for analytics and billing';
COMMENT ON COLUMN subscription_events.event_type IS 'Type of subscription event (started, renewed, canceled, etc.)';
COMMENT ON COLUMN subscription_events.subscription_tier IS 'Subscription tier at the time of the event';
COMMENT ON COLUMN subscription_events.event_data IS 'Additional event data from RevenueCat or other sources';
COMMENT ON COLUMN subscription_events.revenuecat_event_id IS 'Unique identifier from RevenueCat webhook to prevent duplicates';

COMMENT ON VIEW subscription_analytics IS 'Daily aggregated subscription events for analytics dashboard';
COMMENT ON VIEW subscription_metrics IS 'Real-time subscription metrics and KPIs';

COMMENT ON FUNCTION get_user_subscription_status IS 'Get comprehensive subscription status for a user';
COMMENT ON FUNCTION should_show_ads IS 'Determine if ads should be shown to a user based on subscription status';
COMMENT ON FUNCTION log_subscription_event IS 'Log a subscription event with automatic deduplication';

-- Grant necessary permissions
GRANT SELECT ON subscription_analytics TO authenticated;
GRANT SELECT ON subscription_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status TO authenticated;
GRANT EXECUTE ON FUNCTION should_show_ads TO authenticated;
GRANT EXECUTE ON FUNCTION log_subscription_event TO authenticated;
