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
const schematics_1 = require("@angular-devkit/schematics");
const gemini_service_1 = require("./gemini.service");
const find_module_1 = require("./find-module");
const ast_utils_1 = require("@schematics/angular/utility/ast-utils");
const ts = require("typescript");
const change_1 = require("@schematics/angular/utility/change");
// New function to parse the LLM's response
function parseGeneratedCode(fullCodeString) {
    const code = {
        ts: '',
        html: '',
        scss: ''
    };
    const tsMatch = fullCodeString.match(/### filename: .*?\.component\.ts ###\n```typescript\n([\s\S]*?)```/);
    const htmlMatch = fullCodeString.match(/### filename: .*?\.component.html ###\n```html\n([\s\S]*?)```/);
    const scssMatch = fullCodeString.match(/### filename: .*?\.component.scss ###\n```scss\n([\s\S]*?)```/);
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
        // --- Step 2: Parse and write the files
        const parsedCode = parseGeneratedCode(fullCodeString);
        if (!parsedCode.ts || !parsedCode.html) {
            _context.logger.error('Failed to parse component code from LLM output. Generated files may be incomplete.');
            return tree;
        }
        // Now, we'll get the source root from angular.json.
        const modulePath = yield (0, find_module_1.findModuleFromOptions)(tree, _options);
        const sourceRoot = modulePath ? modulePath.substring(1, modulePath.indexOf('/app/app.module.ts')) : 'src';
        const componentPath = `${sourceRoot}/app/${componentName}`;
        // Overwrite existing files or create new ones
        writeOrOverwriteFile(tree, `${componentPath}/${componentName}.component.ts`, parsedCode.ts);
        writeOrOverwriteFile(tree, `${componentPath}/${componentName}.component.html`, parsedCode.html);
        writeOrOverwriteFile(tree, `${componentPath}/${componentName}.component.scss`, parsedCode.scss);
        _context.logger.info(`✅ Component files for "${componentName}" created successfully!`);
        // --- Step 3: Add the component to the nearest module based on standalone status
        if (modulePath) {
            const moduleSource = tree.read(modulePath).toString('utf-8');
            const tsSourceFile = ts.createSourceFile(modulePath, moduleSource, ts.ScriptTarget.Latest, true);
            const componentSource = tree.read(`${componentPath}/${componentName}.component.ts`).toString('utf-8');
            const isStandalone = componentSource.includes('standalone: true');
            const recorder = tree.beginUpdate(modulePath);
            let changes = []; // Changed from InsertChange[]
            const classifiedName = schematics_1.strings.classify(componentName);
            if (isStandalone) {
                // Add to imports array for standalone components
                changes = (0, ast_utils_1.addImportToModule)(tsSourceFile, modulePath, `${componentName}Component`, `./${componentName}/${componentName}.component`);
                _context.logger.info(`✅ Component "${componentName}Component" added to imports of "${modulePath}" (standalone).`);
            }
            else {
                // Add to declarations array for non-standalone components
                changes = (0, ast_utils_1.addDeclarationToModule)(tsSourceFile, modulePath, `${classifiedName}Component`, `./${componentName}/${componentName}.component`);
                _context.logger.info(`✅ Component "${componentName}Component" added to declarations of "${modulePath}" (non-standalone).`);
            }
            for (const change of changes) {
                if (change instanceof change_1.InsertChange) {
                    recorder.insertLeft(change.pos, change.toAdd);
                }
            }
            tree.commitUpdate(recorder);
        }
        else {
            _context.logger.warn(`⚠️ Could not find a module to add the component to. Your project is likely standalone. Please import the component into your app.component.ts file manually.`);
        }
        return tree;
    });
    function writeOrOverwriteFile(tree, filePath, content) {
        if (tree.exists(filePath)) {
            tree.overwrite(filePath, content);
        }
        else {
            tree.create(filePath, content);
        }
    }
}
//# sourceMappingURL=index.js.map