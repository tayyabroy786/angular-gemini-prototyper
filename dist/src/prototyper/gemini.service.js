"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponentCode = generateComponentCode;
const generative_ai_1 = require("@google/generative-ai");
const API_KEY = process.env.GEMINI_API_KEY;
// Throw an error if the key is not defined.
if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please set it before running.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
function generateComponentCode(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!API_KEY) {
            throw new Error("GEMINI_API_KEY environment variable is not set.");
        }
        console.log('Sending prompt to Gemini...');
        const result = yield model.generateContent(prompt);
        const response = yield result.response;
        const text = response.text();
        return text;
    });
}
//# sourceMappingURL=gemini.service.js.map