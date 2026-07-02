const { GoogleGenerativeAI } = require("@google/generative-ai");

async function askGemini(question, modelName, promptTemplate) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: promptTemplate(question) }],
        },
      ],
    });

    const text = await result.response.text();
    return text;
  } catch (error) {
    if (error.status === 429) {
      throw new Error(
        "QUOTA EXCEEDED: You've hit your Gemini API limit. Please wait a minute or check your billing at ai.google.dev."
      );
    }

    if (error.status === 403 || error.status === 401) {
      throw new Error(
        "INVALID API KEY: Your GEMINI_API_KEY is incorrect or doesn't have permission to use this model."
      );
    }

    if (error.status === 404) {
      throw new Error(
        "MODEL NOT FOUND: The Gemini model name might be deprecated or misspelled."
      );
    }

    console.error("Error in Gemini API call failed:", error);
    throw new Error("Failed to get response from Gemini API");
  }
}

module.exports = { askGemini };
