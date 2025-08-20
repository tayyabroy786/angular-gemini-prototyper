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
exports.prototyper = prototyper;
const gemini_service_1 = require("./gemini.service");
// New function to parse the LLM's response
function parseGeneratedCode(fullCodeString) {
    const code = {
        ts: '',
        html: '',
        scss: ''
    };
    const tsMatch = fullCodeString.match(/### filename: .*?\.component\.ts ###\n```typescript\n([\s\S]*?)```/);
    const htmlMatch = fullCodeString.match(/### filename: .*?\.component\.html ###\n```html\n([\s\S]*?)```/);
    const scssMatch = fullCodeString.match(/### filename: .*?\.component\.scss ###\n```scss\n([\s\S]*?)```/);
    if (tsMatch && tsMatch[1]) {
        code.ts = tsMatch[1].trim();
    }
    if (htmlMatch && htmlMatch[1]) {
        code.html = htmlMatch[1].trim();
    }
    if (scssMatch && scssMatch[1]) {
        code.scss = scssMatch[1].trim();
    }
    return code;
}
// The core prompt template that we'll use for the LLM call.
const promptTemplate = `
You are an expert Angular developer assistant whose SOLE purpose is to generate an Angular component based on a user's request. DO NOT provide any conversational responses, multiple options, or explanations. Just provide the code.

Your response MUST follow this exact, structured format:

### filename: [[COMPONENT_NAME]].component.ts ###
\`\`\`typescript
// Angular TypeScript code
\`\`\`

### filename: [[COMPONENT_NAME]].component.html ###
\`\`\`html
<!-- Angular HTML code -->
\`\`\`

### filename: [[COMPONENT_NAME]].component.scss ###
\`\`\`scss
/* Angular SCSS code */
\`\`\`

Instructions:
1. Generate a standalone Angular component.
2. The component's name is "[[COMPONENT_NAME]]".
3. The HTML should use the [[CSS_FRAMEWORK]] framework.
4. The TypeScript file should include a component class with relevant @Input() properties and a mock data object for demonstration.
5. The SCSS should only contain styling that cannot be handled by the CSS framework. If no custom styling is needed, leave the SCSS code block empty.
6. The TypeScript file must include "import { Component } from '@angular/core';" at the top.
7. Do not include any additional comments or explanations in the code blocks.
8. Ensure the code is valid and can be directly used in an Angular project.
User Request:
[[USER_REQUEST]]
`;
function prototyper(_options) {
    return (tree, _context) => __awaiter(this, void 0, void 0, function* () {
        const componentName = _options.name;
        const componentPath = `src/app/${componentName}`;
        const userPrompt = _options.prompt; // Read the prompt from the options
        const cssFramework = 'Tailwind CSS'; // We'll hardcode this for now.
        // --- Step 1: Create the full prompt and call the LLM
        const fullPrompt = promptTemplate
            .replace('[[COMPONENT_NAME]]', componentName)
            .replace('[[CSS_FRAMEWORK]]', cssFramework)
            .replace('[[USER_REQUEST]]', userPrompt);
        let fullCodeString;
        try {
            _context.logger.info(`Sending prompt to Gemini...`);
            fullCodeString = yield (0, gemini_service_1.generateComponentCode)(fullPrompt);
            _context.logger.info(`LLM Response received for component "${componentName}".`);
        }
        catch (error) {
            _context.logger.error(`Failed to generate code: ${error.message}`);
            return tree;
        }
        // --- Step 2: Parse and write the files directly in the schematic's directory.
        const parsedCode = parseGeneratedCode(fullCodeString);
        if (!parsedCode.ts || !parsedCode.html) {
            _context.logger.error('Failed to parse component code from LLM output. Generated files may be incomplete.');
            return tree;
        }
        // ✅ ensure src/app exists
        if (!tree.exists('src/app/app.module.ts')) {
            _context.logger.warn('⚠️ No src/app found — are you running this inside an Angular project?');
        }
        tree.create(`${componentPath}/${componentName}.component.ts`, parsedCode.ts);
        tree.create(`${componentPath}/${componentName}.component.html`, parsedCode.html);
        tree.create(`${componentPath}/${componentName}.component.scss`, parsedCode.scss);
        _context.logger.info(`✅ Component files for "${componentName}" created successfully!`);
        _context.logger.info(`📝 The files were created in a new folder called "${componentName}" in your current directory. Please move them into your Angular project's 'src/app' folder and import the component manually.`);
        return tree;
    });
}
//# sourceMappingURL=index.js.map