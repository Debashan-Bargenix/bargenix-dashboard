-- Comprehensive Analytics Schema for Bargenix

-- Main analytics events table
CREATE TABLE IF NOT EXISTS bargain_events (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(255),
  product_title VARCHAR(255),
  variant_id VARCHAR(255),
  session_id VARCHAR(255),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  ip_address VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  referrer TEXT,
  page_url TEXT,
  original_price DECIMAL(10, 2),
  offered_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2),
  bargain_duration INTEGER, -- in seconds
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bargain_events_shop ON bargain_events(shop_domain);
CREATE INDEX IF NOT EXISTS idx_bargain_events_user ON bargain_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bargain_events_type ON bargain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bargain_events_product ON bargain_events(product_id);
CREATE INDEX IF NOT EXISTS idx_bargain_events_session ON bargain_events(session_id);
CREATE INDEX IF NOT EXISTS idx_bargain_events_customer ON bargain_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_bargain_events_created ON bargain_events(created_at);

-- Aggregated daily analytics for faster dashboard loading
CREATE TABLE IF NOT EXISTS bargain_daily_stats (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_events INTEGER DEFAULT 0,
  button_clicks INTEGER DEFAULT 0,
  chatbot_views INTEGER DEFAULT 0,
  chat_started INTEGER DEFAULT 0,
  bargains_completed INTEGER DEFAULT 0,
  total_original_price DECIMAL(12, 2) DEFAULT 0,
  total_final_price DECIMAL(12, 2) DEFAULT 0,
  total_savings DECIMAL(12, 2) DEFAULT 0,
  mobile_events INTEGER DEFAULT 0,
  desktop_events INTEGER DEFAULT 0,
  tablet_events INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_domain, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_shop ON bargain_daily_stats(shop_domain);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON bargain_daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON bargain_daily_stats(date);

-- Product performance analytics
CREATE TABLE IF NOT EXISTS bargain_product_stats (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(255) NOT NULL,
  product_title VARCHAR(255),
  total_views INTEGER DEFAULT 0,
  total_bargains INTEGER DEFAULT 0,
  successful_bargains INTEGER DEFAULT 0,
  total_original_price DECIMAL(12, 2) DEFAULT 0,
  total_final_price DECIMAL(12, 2) DEFAULT 0,
  total_savings DECIMAL(12, 2) DEFAULT 0,
  last_event_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_domain, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stats_shop ON bargain_product_stats(shop_domain);
CREATE INDEX IF NOT EXISTS idx_product_stats_user ON bargain_product_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_product_stats_product ON bargain_product_stats(product_id);

-- Customer bargaining behavior
CREATE TABLE IF NOT EXISTS bargain_customer_stats (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  total_bargains INTEGER DEFAULT 0,
  successful_bargains INTEGER DEFAULT 0,
  total_original_price DECIMAL(12, 2) DEFAULT 0,
  total_final_price DECIMAL(12, 2) DEFAULT 0,
  total_savings DECIMAL(12, 2) DEFAULT 0,
  average_discount_percentage DECIMAL(5, 2) DEFAULT 0,
  first_bargain_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_bargain_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(shop_domain, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_stats_shop ON bargain_customer_stats(shop_domain);
CREATE INDEX IF NOT EXISTS idx_customer_stats_user ON bargain_customer_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_stats_customer ON bargain_customer_stats(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_stats_email ON bargain_customer_stats(customer_email);

-- Function to update daily stats from events
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO bargain_daily_stats (
    shop_domain, 
    user_id,
    date, 
    total_events,
    button_clicks,
    chatbot_views,
    chat_started,
    bargains_completed,
    mobile_events,
    desktop_events,
    tablet_events
  )
  VALUES (
    NEW.shop_domain,
    NEW.user_id,
    DATE(NEW.created_at),
    1,
    CASE WHEN NEW.event_type = 'button_click' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'chatbot_view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END
  )
  ON CONFLICT (shop_domain, date) DO UPDATE SET
    total_events = bargain_daily_stats.total_events + 1,
    button_clicks = bargain_daily_stats.button_clicks + CASE WHEN NEW.event_type = 'button_click' THEN 1 ELSE 0 END,
    chatbot_views = bargain_daily_stats.chatbot_views + CASE WHEN NEW.event_type = 'chatbot_view' THEN 1 ELSE 0 END,
    chat_started = bargain_daily_stats.chat_started + CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
    bargains_completed = bargain_daily_stats.bargains_completed + CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
    mobile_events = bargain_daily_stats.mobile_events + CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    desktop_events = bargain_daily_stats.desktop_events + CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    tablet_events = bargain_daily_stats.tablet_events + CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily stats
DROP TRIGGER IF EXISTS update_daily_stats_trigger ON bargain_events;
CREATE TRIGGER update_daily_stats_trigger
AFTER INSERT ON bargain_events
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats();

-- Function to update product stats from events
CREATE OR REPLACE FUNCTION update_product_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    INSERT INTO bargain_product_stats (
      shop_domain,
      user_id,
      product_id,
      product_title,
      total_views,
      total_bargains,
      successful_bargains,
      total_original_price,
      total_final_price,
      total_savings,
      last_event_at
    )
    VALUES (
      NEW.shop_domain,
      NEW.user_id,
      NEW.product_id,
      NEW.product_title,
      CASE WHEN NEW.event_type = 'chatbot_view' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
      COALESCE(NEW.original_price, 0),
      CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.final_price, 0) ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) - COALESCE(NEW.final_price, 0) ELSE 0 END,
      NEW.created_at
    )
    ON CONFLICT (shop_domain, product_id) DO UPDATE SET
      product_title = COALESCE(NULLIF(bargain_product_stats.product_title, ''), NEW.product_title),
      total_views = bargain_product_stats.total_views + CASE WHEN NEW.event_type = 'chatbot_view' THEN 1 ELSE 0 END,
      total_bargains = bargain_product_stats.total_bargains + CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
      successful_bargains = bargain_product_stats.successful_bargains + CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
      total_original_price = bargain_product_stats.total_original_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) ELSE 0 END,
      total_final_price = bargain_product_stats.total_final_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.final_price, 0) ELSE 0 END,
      total_savings = bargain_product_stats.total_savings + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) - COALESCE(NEW.final_price, 0) ELSE 0 END,
      last_event_at = NEW.created_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update product stats
DROP TRIGGER IF EXISTS update_product_stats_trigger ON bargain_events;
CREATE TRIGGER update_product_stats_trigger
AFTER INSERT ON bargain_events
FOR EACH ROW
EXECUTE FUNCTION update_product_stats();

-- Function to update customer stats from events
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL OR NEW.customer_email IS NOT NULL THEN
    INSERT INTO bargain_customer_stats (
      shop_domain,
      user_id,
      customer_id,
      customer_email,
      total_bargains,
      successful_bargains,
      total_original_price,
      total_final_price,
      total_savings,
      first_bargain_at,
      last_bargain_at
    )
    VALUES (
      NEW.shop_domain,
      NEW.user_id,
      COALESCE(NEW.customer_id, ''),
      COALESCE(NEW.customer_email, ''),
      CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.final_price, 0) ELSE 0 END,
      CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) - COALESCE(NEW.final_price, 0) ELSE 0 END,
      NEW.created_at,
      NEW.created_at
    )
    ON CONFLICT (shop_domain, customer_id) DO UPDATE SET
      customer_email = COALESCE(NULLIF(bargain_customer_stats.customer_email, ''), NEW.customer_email),
      total_bargains = bargain_customer_stats.total_bargains + CASE WHEN NEW.event_type = 'chat_started' THEN 1 ELSE 0 END,
      successful_bargains = bargain_customer_stats.successful_bargains + CASE WHEN NEW.event_type = 'bargain_completed' THEN 1 ELSE 0 END,
      total_original_price = bargain_customer_stats.total_original_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) ELSE 0 END,
      total_final_price = bargain_customer_stats.total_final_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.final_price, 0) ELSE 0 END,
      total_savings = bargain_customer_stats.total_savings + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) - COALESCE(NEW.final_price, 0) ELSE 0 END,
      first_bargain_at = LEAST(bargain_customer_stats.first_bargain_at, NEW.created_at),
      last_bargain_at = GREATEST(bargain_customer_stats.last_bargain_at, NEW.created_at),
      average_discount_percentage = CASE 
        WHEN bargain_customer_stats.total_original_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) ELSE 0 END > 0 THEN
          ((bargain_customer_stats.total_original_price - bargain_customer_stats.total_final_price) + 
           CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) - COALESCE(NEW.final_price, 0) ELSE 0 END) / 
          (bargain_customer_stats.total_original_price + CASE WHEN NEW.event_type = 'bargain_completed' THEN COALESCE(NEW.original_price, 0) ELSE 0 END) * 100
        ELSE 0
      END,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update customer stats
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON bargain_events;
CREATE TRIGGER update_customer_stats_trigger
AFTER INSERT ON bargain_events
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();
