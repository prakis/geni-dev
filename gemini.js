const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const MD_CODE_QUOTES = '```';

function testcall(){
    return 'success';
}
async function askGemini(question){
    //const prompt = "Explain how AI works";
    const result = await model.generateContent(question);
    const text_restult = result.response.text();
    //console.log(text_restult);
    return clearResult(text_restult);
}
function clearResult(result){
    let trimmed = result.trim();
    if(trimmed.length <= 6){
        return trimmed;
    }
    let isStartsWithCodeQuotes = trimmed.startsWith(MD_CODE_QUOTES);
    let isEndsWithCodeQuotes = trimmed.endsWith(MD_CODE_QUOTES);
    let cleanedResult = "";
    if(isStartsWithCodeQuotes && isEndsWithCodeQuotes){
        cleanedResult = trimmed.substr(3, trimmed.length-6);
    }

    return cleanedResult.trim();
}

module.exports = { testcall, askGemini }