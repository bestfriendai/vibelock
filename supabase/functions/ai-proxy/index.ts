// AI Proxy Edge Function - Secure API key management
// This function acts as a proxy for AI API calls, keeping API keys secure on the server

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRequest {
  provider: "openai" | "anthropic" | "grok";
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Initialize Supabase client for auth verification
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid or expired token");
    }

    // Parse request body
    const { provider, prompt, model, maxTokens = 1000, temperature = 0.7 }: AIRequest = await req.json();

    if (!provider || !prompt) {
      throw new Error("Missing required fields: provider and prompt");
    }

    let response: AIResponse;

    switch (provider) {
      case "openai":
        response = await callOpenAI(prompt, model || "gpt-4o-2024-11-20", maxTokens, temperature);
        break;
      case "anthropic":
        response = await callAnthropic(prompt, model || "claude-3-5-sonnet-20241022", maxTokens, temperature);
        break;
      case "grok":
        response = await callGrok(prompt, model || "grok-beta", maxTokens, temperature);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("AI Proxy Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        code: "AI_PROXY_ERROR",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

async function callOpenAI(prompt: string, model: string, maxTokens: number, temperature: number): Promise<AIResponse> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

async function callAnthropic(
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AIResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    response: data.content[0]?.text || "",
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };
}

async function callGrok(prompt: string, model: string, maxTokens: number, temperature: number): Promise<AIResponse> {
  const apiKey = Deno.env.get("GROK_API_KEY");
  if (!apiKey) {
    throw new Error("Grok API key not configured");
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}
