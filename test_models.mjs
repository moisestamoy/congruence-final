import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAFaCWwil2BEX_J3KXho51Q37-MesMM5o8";
const genAI = new GoogleGenerativeAI(API_KEY);

const models = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-pro"
];

async function testModels() {
    console.log("Testing Gemini models with provided API Key...");
    let success = false;

    for (const modelName of models) {
        try {
            console.log(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, world!");
            const response = await result.response;
            console.log(`✅ SUCCESS: ${modelName} is working!`);
            console.log(`Response: ${response.text().substring(0, 20)}...`);
            success = true;
            break;
        } catch (error) {
            console.error(`❌ FAILED: ${modelName}`);
            // extract error message safely
            const msg = error.message || JSON.stringify(error);
            console.error(`Error: ${msg.substring(0, 150)}...`); // truncate
        }
    }

    if (!success) {
        console.error("All tested models failed. Check API Key permissions or quota.");
    }
}

testModels();
