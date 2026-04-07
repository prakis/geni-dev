function loadGeniModule({
  apiKey = "test-key",
  generatedText = "git status",
  generateError = null,
  onGenerateContent = null,
} = {}) {
  jest.resetModules();
  process.env.GEMINI_API_KEY = apiKey;

  jest.doMock("@google/generative-ai", () => {
    const generateContent = jest.fn(async (payload) => {
      if (onGenerateContent) {
        onGenerateContent(payload);
      }
      if (generateError) {
        throw generateError;
      }
      return {
        response: {
          text: async () => generatedText,
        },
      };
    });

    const getGenerativeModel = jest.fn(() => ({ generateContent }));
    const GoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel }));

    return { GoogleGenerativeAI };
  });

  return require("./geni");
}

describe("geni tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  test("stripCodeFences removes triple backticks", () => {
    const { stripCodeFences } = loadGeniModule();
    const input = "```bash\ngit status\n```";
    const expected = "bash\ngit status";
    expect(stripCodeFences(input)).toBe(expected);
  });

  test("stripCodeFences works with plain text", () => {
    const { stripCodeFences } = loadGeniModule();
    expect(stripCodeFences("git status")).toBe("git status");
  });

  test("processQuestion strips wrapping quotes before prompting Gemini", async () => {
    let promptText = "";
    const { processQuestion } = loadGeniModule({
      generatedText: "git branch -d feature-x",
      onGenerateContent: (payload) => {
        promptText = payload.contents[0].parts[0].text;
      },
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await processQuestion(['"how to delete a git branch?"']);

    expect(promptText).toContain("User: how to delete a git branch?");
    expect(logSpy).toHaveBeenCalledWith("git branch -d feature-x");
  });

  test("processQuestion exits when GEMINI_API_KEY is missing", async () => {
    const { processQuestion } = loadGeniModule({ apiKey: "" });
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((code) => {
        throw new Error(`process.exit:${code}`);
      });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(processQuestion(["hello"])).rejects.toThrow("process.exit:1");

    expect(errorSpy).toHaveBeenCalledWith(
      "Error: GEMINI_API_KEY environment variable not set."
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("askGemini maps 429 to quota exceeded message", async () => {
    const { askGemini } = loadGeniModule({ generateError: { status: 429 } });

    await expect(askGemini("anything")).rejects.toThrow(/QUOTA EXCEEDED/);
  });

  test("askGemini maps unknown errors to generic failure", async () => {
    const { askGemini } = loadGeniModule({
      generateError: new Error("boom"),
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(askGemini("anything")).rejects.toThrow(
      "Failed to get response from Gemini API"
    );
  });
});
