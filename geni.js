#!/usr/bin/env node

//const readline = require("readline");
const https = require("https");
//const http = require("http");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const packageJson = require('./package.json');

/*const PROMPT_TEMPLATE_old = (question) =>
  `Respond with only the terminal command(s) needed. No explanation.\nQuestion: ${question}`;*/

const PROMPT_TEMPLATE = (question) => `
You are a CLI assistant. Output ONLY terminal commands.
Use # comments (max 5 words) when multiple options exist.
No prose, no markdown backticks, no explanations.

Examples:
User: how to undo last git commit?
Response:
git reset --soft HEAD~1     # keeps changes staged
# git reset --hard HEAD~1   # discards changes

User: find a file named config
Response: find . -name "config"

User: ${question}
Response:`;


function stripCodeFences(text) {
  return text.replace(/```/g, "").trim();
}

/*
// backend api key functionality is removed, only Gemini API is supported now. This is the old function that called the geni.dev API. 

function askGeniDev(question) {
    //console.log('Question:', question);
    //console.log("\n");
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
}*/

async function askGemini(question) {
    try{
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
        // gemin-2.5-pro is a better model but often getting high demand error, so switching back to flash-lite
        //const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
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
        // 1. Check for specific HTTP Status Codes
      if (error.status === 429) {
        throw new Error("QUOTA EXCEEDED: You've hit your Gemini API limit. Please wait a minute or check your billing at ai.google.dev.");
      } 
      
      if (error.status === 403 || error.status === 401) {
        throw new Error("INVALID API KEY: Your GEMINI_API_KEY is incorrect or doesn't have permission to use this model.");
      }

      if (error.status === 404) {
        throw new Error("MODEL NOT FOUND: The model name you are using might be deprecated or typoed.");
      }
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

  processQuestion(args);
}

async function processQuestion(args) {
  let answer = "";
  let question = args.join(" ").trim();
  if (
    (question.startsWith("\"") && question.endsWith("\"")) ||
    (question.startsWith("'") && question.endsWith("'"))
  ) {
    question = question.slice(1, -1);
  }

  try {

      if(!GEMINI_API_KEY){
        console.error("Error: GEMINI_API_KEY environment variable not set.");
        process.exit(1);
      }
      answer = await askGemini(question);
    
      console.log(answer);

  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
  return answer;
}

if (require.main === module) {
  main();
}

// Optional: Export for unit testing
module.exports = {
  processQuestion,
  askGemini,
  stripCodeFences,
};
