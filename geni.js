#!/usr/bin/env node

//const readline = require("readline");
const https = require("https");
//const http = require("http");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = process.env;
const packageJson = require('./package.json');

const PROMPT_TEMPLATE = (question) =>
  `Respond with only the terminal command(s) needed. No explanation.\nQuestion: ${question}`;

function stripCodeFences(text) {
  return text.replace(/```/g, "").trim();
}

function askGeniDev(question) {
    console.log('Question:', question);
    if(!question || question.length > 500 || question.length < 2){
        return "Please provide a short question, 500 characters.";
    }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ question });
    const req = https.request(
      "https://api.geni.dev/api/question",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolve(stripCodeFences(parsed.answer));
          } catch (e) {
            reject("Error parsing response: " + e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function askGemini(question) {
    try{
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
        contents: [
            {
            role: "user",
            parts: [{ text: PROMPT_TEMPLATE(question) }],
            },
        ],
        });

        const text = await result.response.text();
        return stripCodeFences(text);
    } catch (error) {
        console.error("Error in Gemini API call failed:", error);
        throw new Error("Failed to get response from Gemini API");
    }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Version: ${packageJson.version}\n`);
    console.error("Usage: geni <your question here>");
    process.exit(1);
  }

  let question = args.join(" ").trim();
  if (
    (question.startsWith("\"") && question.endsWith("\"")) ||
    (question.startsWith("'") && question.endsWith("'"))
  ) {
    question = question.slice(1, -1);
  }

  try {
    const answer = GEMINI_API_KEY
      ? await askGemini(question)
      : await askGeniDev(question);
    console.log(answer);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// Optional: Export for unit testing
module.exports = {
  askGemini,
  askGeniDev,
  stripCodeFences,
};
