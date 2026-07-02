const Anthropic = require("@anthropic-ai/sdk");

async function askAnthropic(question, modelName, promptTemplate) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable not set.");
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: modelName,
      max_tokens: 1024,
      messages: [{ role: "user", content: promptTemplate(question) }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "";
  } catch (error) {
    const status = error.status || error.response?.status;

    if (status === 429) {
      throw new Error(
        "QUOTA EXCEEDED: You've hit your Anthropic API limit. Please wait or check your billing at console.anthropic.com."
      );
    }

    if (status === 403 || status === 401) {
      throw new Error(
        "INVALID API KEY: Your ANTHROPIC_API_KEY is incorrect or doesn't have permission to use this model."
      );
    }

    if (status === 404) {
      throw new Error(
        "MODEL NOT FOUND: The Anthropic model name might be deprecated or misspelled."
      );
    }

    console.error("Error in Anthropic API call failed:", error);
    throw new Error("Failed to get response from Anthropic API");
  }
}

module.exports = { askAnthropic };
