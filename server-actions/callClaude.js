const axios = require('axios');
const https = require('https');

const run = async (r, args) => {
  try {
    const installParams = r?.context?.installation?.installationParams || args?.context?.installation?.installationParams || {};
    const apiKey = installParams.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "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";
    
    const payload = args?.payload || args || {};
    const prompt = payload.prompt;
    if (!prompt) {
      return { success: false, error: "Prompt is required" };
    }

    const agent = new https.Agent({ rejectUnauthorized: false });

    let response;
    try {
      response = await axios.post("https://api.anthropic.com/v1/messages", {
        model: "claude-3-5-haiku-20241022",
        system: "You are the Margin Slip Detector AI Assistant. You ONLY assist with professional project management, resource allocation, revenue/cost modeling, margin forecasting, and project slip risk analysis. If a query is off-topic or unrelated to project margins, hours, scheduling, or business metrics (such as food, cooking, general knowledge, recipes, sports, or casual non-business topics like butter chicken), decline politely and state that you are designed specifically to analyze project health and protect project margins. Keep it brief (1-2 sentences).",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        httpsAgent: agent
      });
    } catch (err) {
      if (err.response?.status === 404 && err.response?.data?.error?.type === "not_found_error") {
        // Fallback to the sandbox mock model
        response = await axios.post("https://api.anthropic.com/v1/messages", {
          model: "claude-haiku-4-5-20251001",
          system: "You are the Margin Slip Detector AI Assistant. You ONLY assist with professional project management, resource allocation, revenue/cost modeling, margin forecasting, and project slip risk analysis. If a query is off-topic or unrelated to project margins, hours, scheduling, or business metrics (such as food, cooking, general knowledge, recipes, sports, or casual non-business topics like butter chicken), decline politely and state that you are designed specifically to analyze project health and protect project margins. Keep it brief (1-2 sentences).",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        }, {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          httpsAgent: agent
        });
      } else {
        throw err;
      }
    }

    const data = response.data;
    if (data.error) {
      return { success: false, error: data.error.message || "Anthropic API Error" };
    }

    const txt = data.content?.find(b => b.type === "text")?.text || "Analysis unavailable.";
    return { success: true, text: txt };
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    return { success: false, error: errMsg };
  }
};

module.exports = { run };

