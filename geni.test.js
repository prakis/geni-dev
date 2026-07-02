const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  GENI_AI_MODEL: process.env.GENI_AI_MODEL,
};

function restoreEnvVar(name) {
  const value = originalEnv[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function applyLocalGeniAiModel() {
  restoreEnvVar("GENI_AI_MODEL");
}

function parseModelString(raw) {
  const colonIndex = raw.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid GENI_AI_MODEL: "${raw}"`);
  }

  return {
    provider: raw.slice(0, colonIndex).trim().toLowerCase(),
    model: raw.slice(colonIndex + 1).trim(),
  };
}

function getLocalAiModelConfig() {
  applyLocalGeniAiModel();
  if (originalEnv.GENI_AI_MODEL) {
    return parseModelString(originalEnv.GENI_AI_MODEL);
  }

  return parseModelString(loadGeniModule().DEFAULT_AI_MODEL);
}

function loadGeniModule({
  geminiApiKey = "test-gemini-key",
  openaiApiKey,
  anthropicApiKey,
  geminiResponse = "git status",
  openaiResponse = "git status",
  anthropicResponse = "git status",
  geminiError = null,
  openaiError = null,
  anthropicError = null,
  onGeminiGenerateContent = null,
  onOpenAICreate = null,
  onAnthropicCreate = null,
} = {}) {
  jest.resetModules();

  if (geminiApiKey !== undefined) {
    process.env.GEMINI_API_KEY = geminiApiKey;
  }
  if (openaiApiKey !== undefined) {
    process.env.OPENAI_API_KEY = openaiApiKey;
  }
  if (anthropicApiKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = anthropicApiKey;
  }

  jest.doMock("@google/generative-ai", () => {
    const generateContent = jest.fn(async (payload) => {
      if (onGeminiGenerateContent) {
        onGeminiGenerateContent(payload);
      }
      if (geminiError) {
        throw geminiError;
      }
      return {
        response: {
          text: async () => geminiResponse,
        },
      };
    });

    const getGenerativeModel = jest.fn((config) => {
      getGenerativeModel.lastModel = config.model;
      return { generateContent };
    });
    const GoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel }));

    return { GoogleGenerativeAI, getGenerativeModel };
  });

  jest.doMock("openai", () => {
    const create = jest.fn(async (payload) => {
      if (onOpenAICreate) {
        onOpenAICreate(payload);
      }
      if (openaiError) {
        throw openaiError;
      }
      return {
        choices: [{ message: { content: openaiResponse } }],
      };
    });

    const OpenAI = jest.fn(() => ({
      chat: { completions: { create } },
    }));
    OpenAI.create = create;

    return OpenAI;
  });

  jest.doMock("@anthropic-ai/sdk", () => {
    const create = jest.fn(async (payload) => {
      if (onAnthropicCreate) {
        onAnthropicCreate(payload);
      }
      if (anthropicError) {
        throw anthropicError;
      }
      return {
        content: [{ type: "text", text: anthropicResponse }],
      };
    });

    const Anthropic = jest.fn(() => ({
      messages: { create },
    }));
    Anthropic.create = create;

    return Anthropic;
  });

  return require("./geni");
}

describe("geni tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    restoreEnvVar("GEMINI_API_KEY");
    restoreEnvVar("OPENAI_API_KEY");
    restoreEnvVar("ANTHROPIC_API_KEY");
    restoreEnvVar("GENI_AI_MODEL");
  });

  describe("stripCodeFences", () => {
    test("removes triple backticks", () => {
      const { stripCodeFences } = loadGeniModule();
      const input = "```bash\ngit status\n```";
      expect(stripCodeFences(input)).toBe("bash\ngit status");
    });

    test("works with plain text", () => {
      const { stripCodeFences } = loadGeniModule();
      expect(stripCodeFences("git status")).toBe("git status");
    });
  });

  describe("parseAiModel", () => {
    test("defaults to gemini when GENI_AI_MODEL is unset", () => {
      delete process.env.GENI_AI_MODEL;
      const geni = loadGeniModule();
      expect(geni.parseAiModel()).toEqual(parseModelString(geni.DEFAULT_AI_MODEL));
    });

    test("parses provider and model from local GENI_AI_MODEL", () => {
      applyLocalGeniAiModel();
      const geni = loadGeniModule();
      const expected = originalEnv.GENI_AI_MODEL
        ? parseModelString(originalEnv.GENI_AI_MODEL)
        : parseModelString(geni.DEFAULT_AI_MODEL);

      expect(geni.parseAiModel()).toEqual(expected);
    });

    test("parses openai provider and model", () => {
      process.env.GENI_AI_MODEL = "openai:gpt-4o";
      const { parseAiModel } = loadGeniModule();
      expect(parseAiModel()).toEqual({
        provider: "openai",
        model: "gpt-4o",
      });
    });

    test("parses anthropic provider and model names with spaces", () => {
      process.env.GENI_AI_MODEL = "anthropic:sonnet 4.5";
      const { parseAiModel } = loadGeniModule();
      expect(parseAiModel()).toEqual({
        provider: "anthropic",
        model: "sonnet 4.5",
      });
    });

    test("normalizes provider casing and trims whitespace", () => {
      process.env.GENI_AI_MODEL = " Gemini : gemini-1.5-flash ";
      const { parseAiModel } = loadGeniModule();
      expect(parseAiModel()).toEqual({
        provider: "gemini",
        model: "gemini-1.5-flash",
      });
    });

    test("throws when GENI_AI_MODEL is missing a colon", () => {
      process.env.GENI_AI_MODEL = "gpt-4o";
      const { parseAiModel } = loadGeniModule();
      expect(() => parseAiModel()).toThrow(/Invalid GENI_AI_MODEL format/);
    });

    test("throws when provider or model is empty", () => {
      process.env.GENI_AI_MODEL = "openai:";
      const { parseAiModel: parseMissingModel } = loadGeniModule();
      expect(() => parseMissingModel()).toThrow(/Invalid GENI_AI_MODEL format/);

      process.env.GENI_AI_MODEL = ":gpt-4o";
      const { parseAiModel: parseMissingProvider } = loadGeniModule();
      expect(() => parseMissingProvider()).toThrow(/Invalid GENI_AI_MODEL format/);
    });
  });

  describe("askAI", () => {
    test("routes using local GENI_AI_MODEL and strips code fences from the response", async () => {
      const { provider } = getLocalAiModelConfig();
      applyLocalGeniAiModel();
      const moduleOptions = {
        geminiResponse: "```bash\ngit log\n```",
        openaiResponse: "```bash\ngit log\n```",
        anthropicResponse: "```bash\ngit log\n```",
      };

      if (provider === "openai") {
        moduleOptions.openaiApiKey = "test-openai-key";
      } else if (provider === "anthropic") {
        moduleOptions.anthropicApiKey = "test-anthropic-key";
      }

      const { askAI } = loadGeniModule(moduleOptions);
      await expect(askAI("show git history")).resolves.toBe("bash\ngit log");
    });

    test("routes to OpenAI with the configured model", async () => {
      process.env.GENI_AI_MODEL = "openai:gpt-4o";
      let requestPayload;
      const { askAI } = loadGeniModule({
        openaiApiKey: "test-openai-key",
        openaiResponse: "git diff",
        onOpenAICreate: (payload) => {
          requestPayload = payload;
        },
      });

      await expect(askAI("show unstaged changes")).resolves.toBe("git diff");
      expect(requestPayload.model).toBe("gpt-4o");
      expect(requestPayload.messages[0].content).toContain(
        "User: show unstaged changes"
      );
    });

    test("routes to Anthropic with the configured model", async () => {
      process.env.GENI_AI_MODEL = "anthropic:claude-sonnet-4-20250514";
      let requestPayload;
      const { askAI } = loadGeniModule({
        anthropicApiKey: "test-anthropic-key",
        anthropicResponse: "kubectl get pods",
        onAnthropicCreate: (payload) => {
          requestPayload = payload;
        },
      });

      await expect(askAI("list kubernetes pods")).resolves.toBe("kubectl get pods");
      expect(requestPayload.model).toBe("claude-sonnet-4-20250514");
      expect(requestPayload.messages[0].content).toContain(
        "User: list kubernetes pods"
      );
    });

    test("throws for unsupported providers", async () => {
      process.env.GENI_AI_MODEL = "cohere:command-r";
      const { askAI } = loadGeniModule();

      await expect(askAI("anything")).rejects.toThrow(
        'Unsupported AI provider "cohere". Supported providers: gemini, openai, anthropic.'
      );
    });
  });

  describe("processQuestion", () => {
    test("strips wrapping quotes before prompting the configured provider", async () => {
      const { provider } = getLocalAiModelConfig();
      applyLocalGeniAiModel();
      let promptText = "";
      const moduleOptions = {
        geminiResponse: "git branch -d feature-x",
        openaiResponse: "git branch -d feature-x",
        anthropicResponse: "git branch -d feature-x",
      };

      if (provider === "gemini") {
        moduleOptions.onGeminiGenerateContent = (payload) => {
          promptText = payload.contents[0].parts[0].text;
        };
      } else if (provider === "openai") {
        moduleOptions.openaiApiKey = "test-openai-key";
        moduleOptions.onOpenAICreate = (payload) => {
          promptText = payload.messages[0].content;
        };
      } else if (provider === "anthropic") {
        moduleOptions.anthropicApiKey = "test-anthropic-key";
        moduleOptions.onAnthropicCreate = (payload) => {
          promptText = payload.messages[0].content;
        };
      }

      const { processQuestion } = loadGeniModule(moduleOptions);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      await processQuestion(['"how to delete a git branch?"']);

      expect(promptText).toContain("User: how to delete a git branch?");
      expect(logSpy).toHaveBeenCalledWith("git branch -d feature-x");
    });

    test("exits when GEMINI_API_KEY is missing for gemini models", async () => {
      process.env.GENI_AI_MODEL = "gemini:gemini-2.5-flash-lite";
      const { processQuestion } = loadGeniModule({ geminiApiKey: "" });
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`process.exit:${code}`);
        });
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(processQuestion(["hello"])).rejects.toThrow("process.exit:1");

      expect(errorSpy).toHaveBeenCalledWith(
        "Error:",
        "GEMINI_API_KEY environment variable not set."
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("exits when OPENAI_API_KEY is missing for OpenAI models", async () => {
      process.env.GENI_AI_MODEL = "openai:gpt-4o";
      const { processQuestion } = loadGeniModule({ openaiApiKey: "" });
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`process.exit:${code}`);
        });
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(processQuestion(["hello"])).rejects.toThrow("process.exit:1");

      expect(errorSpy).toHaveBeenCalledWith(
        "Error:",
        "OPENAI_API_KEY environment variable not set."
      );
    });

    test("exits when ANTHROPIC_API_KEY is missing for Anthropic models", async () => {
      process.env.GENI_AI_MODEL = "anthropic:sonnet 4.5";
      const { processQuestion } = loadGeniModule({ anthropicApiKey: "" });
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`process.exit:${code}`);
        });
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(processQuestion(["hello"])).rejects.toThrow("process.exit:1");

      expect(errorSpy).toHaveBeenCalledWith(
        "Error:",
        "ANTHROPIC_API_KEY environment variable not set."
      );
    });
  });

  describe("provider error handling", () => {
    test("askGemini maps 429 to quota exceeded message", async () => {
      const { askGemini } = loadGeniModule({ geminiError: { status: 429 } });

      await expect(
        askGemini("anything", "gemini-2.5-flash-lite", (q) => q)
      ).rejects.toThrow(/QUOTA EXCEEDED/);
    });

    test("askGemini maps 401 to invalid api key message", async () => {
      const { askGemini } = loadGeniModule({ geminiError: { status: 401 } });

      await expect(
        askGemini("anything", "gemini-2.5-flash-lite", (q) => q)
      ).rejects.toThrow(/INVALID API KEY/);
    });

    test("askGemini maps unknown errors to generic failure", async () => {
      const { askGemini } = loadGeniModule({
        geminiError: new Error("boom"),
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        askGemini("anything", "gemini-2.5-flash-lite", (q) => q)
      ).rejects.toThrow("Failed to get response from Gemini API");
    });

    test("askAI maps OpenAI 429 to quota exceeded message", async () => {
      process.env.GENI_AI_MODEL = "openai:gpt-4o";
      const { askAI } = loadGeniModule({
        openaiApiKey: "test-openai-key",
        openaiError: { status: 429 },
      });

      await expect(askAI("anything")).rejects.toThrow(/QUOTA EXCEEDED/);
    });

    test("askAI maps OpenAI unknown errors to generic failure", async () => {
      process.env.GENI_AI_MODEL = "openai:gpt-4o";
      const { askAI } = loadGeniModule({
        openaiApiKey: "test-openai-key",
        openaiError: new Error("boom"),
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(askAI("anything")).rejects.toThrow(
        "Failed to get response from OpenAI API"
      );
    });

    test("askAI maps Anthropic 429 to quota exceeded message", async () => {
      process.env.GENI_AI_MODEL = "anthropic:sonnet 4.5";
      const { askAI } = loadGeniModule({
        anthropicApiKey: "test-anthropic-key",
        anthropicError: { status: 429 },
      });

      await expect(askAI("anything")).rejects.toThrow(/QUOTA EXCEEDED/);
    });

    test("askAI maps Anthropic unknown errors to generic failure", async () => {
      process.env.GENI_AI_MODEL = "anthropic:sonnet 4.5";
      const { askAI } = loadGeniModule({
        anthropicApiKey: "test-anthropic-key",
        anthropicError: new Error("boom"),
      });
      jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(askAI("anything")).rejects.toThrow(
        "Failed to get response from Anthropic API"
      );
    });
  });
});
