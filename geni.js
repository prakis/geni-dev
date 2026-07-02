#!/usr/bin/env node

//const readline = require("readline");
const https = require("https");
//const http = require("http");
const packageJson = require("./package.json");
const { askGemini } = require("./providers/gemini");
const { askOpenAI } = require("./providers/openai");
const { askAnthropic } = require("./providers/anthropic");

const DEFAULT_AI_MODEL = "gemini:gemini-2.5-flash-lite-test";

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

function parseAiModel() {
  const raw = process.env.GENI_AI_MODEL || DEFAULT_AI_MODEL;
  const colonIndex = raw.indexOf(":");

  if (colonIndex === -1) {
    throw new Error(
      'Invalid GENI_AI_MODEL format. Expected provider:model (e.g. gemini:gemini-1.5-flash).'
    );
  }

  const provider = raw.slice(0, colonIndex).trim().toLowerCase();
  const model = raw.slice(colonIndex + 1).trim();

  if (!provider || !model) {
    throw new Error(
      'Invalid GENI_AI_MODEL format. Expected provider:model (e.g. openai:gpt-4o).'
    );
  }

  return { provider, model };
}

async function askAI(question) {
  const { provider, model } = parseAiModel();

  let answer;
  switch (provider) {
    case "gemini":
      answer = await askGemini(question, model, PROMPT_TEMPLATE);
      break;
    case "openai":
      answer = await askOpenAI(question, model, PROMPT_TEMPLATE);
      break;
    case "anthropic":
      answer = await askAnthropic(question, model, PROMPT_TEMPLATE);
      break;
    default:
      throw new Error(
        `Unsupported AI provider "${provider}". Supported providers: gemini, openai, anthropic.`
      );
  }

  return stripCodeFences(answer);
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
    (question.startsWith('"') && question.endsWith('"')) ||
    (question.startsWith("'") && question.endsWith("'"))
  ) {
    question = question.slice(1, -1);
  }

  try {
    answer = await askAI(question);
    console.log(answer);
  } catch (e) {
    console.error("Error:", e.message || e);
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
  askAI,
  askGemini,
  parseAiModel,
  stripCodeFences,
  PROMPT_TEMPLATE,
  DEFAULT_AI_MODEL,
};
