const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function testcall(){
    return 'success';
}
async function askGemini(question){
    //const prompt = "Explain how AI works";
    const result = await model.generateContent(question);
    const text_restult = result.response.text();
    //console.log(text_restult);
    return text_restult;
}

module.exports = { testcall, askGemini }