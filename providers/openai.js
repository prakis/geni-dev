const OpenAI = require("openai");

async function askOpenAI(question, modelName, promptTemplate) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable not set.");
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: promptTemplate(question) }],
    });

    return response.choices[0].message.content;
  } catch (error) {
    const status = error.status || error.response?.status;

    if (status === 429) {
      throw new Error(
        "QUOTA EXCEEDED: You've hit your OpenAI API limit. Please wait or check your billing at platform.openai.com."
      );
    }

    if (status === 403 || status === 401) {
      throw new Error(
        "INVALID API KEY: Your OPENAI_API_KEY is incorrect or doesn't have permission to use this model."
      );
    }

    if (status === 404) {
      throw new Error(
        "MODEL NOT FOUND: The OpenAI model name might be deprecated or misspelled."
      );
    }

    console.error("Error in OpenAI API call failed:", error);
    throw new Error("Failed to get response from OpenAI API");
  }
}

module.exports = { askOpenAI };
