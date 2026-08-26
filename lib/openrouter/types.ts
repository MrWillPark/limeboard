export type KeyInfo = {
  label: string;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  byok_usage: number;
  byok_usage_daily: number;
  byok_usage_weekly: number;
  byok_usage_monthly: number;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  is_free_tier: boolean;
  is_management_key: boolean;
  is_provisioning_key: boolean;
  include_byok_in_limit: boolean;
  creator_user_id: string | null;
  expires_at: string | null;
  rate_limit?: {
    requests: number;
    interval: string;
    note: string;
  };
};

export type CreditsInfo = {
  total_credits: number;
  total_usage: number;
};

export type ManagedKey = {
  created_at: string;
  updated_at: string;
  hash: string;
  label: string;
  name: string | null;
  disabled: boolean;
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  include_byok_in_limit: boolean;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  byok_usage: number;
  byok_usage_daily: number;
  byok_usage_weekly: number;
  byok_usage_monthly: number;
};

export type ActivityItem = {
  date: string;
  endpoint_id: string;
  model: string;
  model_permaslug: string;
  provider_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
  requests: number;
  usage: number;
  byok_usage_inference: number;
};

export type ModelPricing = {
  id: string;
  name: string;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
};
