import { Rule, SchematicContext, strings, Tree } from '@angular-devkit/schematics';
import { generateComponentCode } from './gemini.service';
import { findModuleFromOptions } from './find-module';
import { addImportToModule } from '@schematics/angular/utility/ast-utils';
import * as ts from 'typescript';
import { normalize } from '@angular-devkit/core';
import { Change, InsertChange } from '@schematics/angular/utility/change';


/**
 * Parses the LLM's response to extract code for multiple component files.
 * The regex patterns have been made more flexible to handle variations in the LLM's output.
 */
function parseGeneratedCode(fullCodeString: string): { name: string, ts: string, html: string, style: string, path: string }[] {
  const components = [];
  const componentBlocks = fullCodeString.split(/### filename: /);

  for (const block of componentBlocks) {
    if (!block.trim()) {
      continue;
    }

    // Capture the filename from the first line of the block
    const filenameMatch = block.match(/(.*?)\n/);
    if (!filenameMatch || !filenameMatch[1]) {
      continue;
    }
    const filename = filenameMatch[1].trim().replace(/\s*#+\s*$/, ''); // Remove trailing hashes
    const filePath = filename; // The filename is now the path, e.g., 'blog/blog.component.ts'

    // Use more flexible regex to capture code blocks without requiring a newline after the language tag
    const tsMatch = block.match(/```typescript\s*([\s\S]*?)\s*```/);
    const htmlMatch = block.match(/```html\s*([\s\S]*?)\s*```/);
    const styleMatch = block.match(/```(scss|css)\s*([\s\S]*?)\s*```/);
    
    // Extract the component name from the filename (e.g., 'blog-post-list')
    const componentName = strings.dasherize(filename.split('.')[0].split('/').pop()!);


    // Push the parsed code into the components array
    if (tsMatch || htmlMatch || styleMatch) {
      components.push({
        name: componentName,
        ts: tsMatch ? tsMatch[1].trim() : '',
        html: htmlMatch ? htmlMatch[1].trim() : '',
        style: styleMatch ? styleMatch[2].trim() : '',
        path: filePath,
      });
    }
  }

  return components;
}

// The core prompt template that we'll use for the LLM call.
const promptTemplate = `
You are an expert Angular developer assistant whose SOLE purpose is to generate multiple Angular components based on a user's request. DO NOT provide any conversational responses, multiple options, or explanations. Just provide the code.

Your response MUST follow this exact, structured format for each component. The filenames should be descriptive and use kebab-case. For example, '### filename: blog/blog-post-list.component.ts ###'

Instructions:
1. Generate the files for a parent component and a child component.
2. The parent component should be named "[[COMPONENT_NAME]]" and the child component should be a descriptive name based on the prompt.
3. The parent component should import and use the child component.
4. Both components should be standalone.
5. The HTML should use the Tailwind CSS framework.
6. The TypeScript files must include "import { Component } from '@angular/core';" at the top.
7. The [[STYLE_LANGUAGE]] files should only contain styling that cannot be handled by the Tailwind CSS framework. If no custom styling is needed, leave the code blocks empty.
8. Ensure the code is valid and can be directly used in an Angular project.
User Request:
[[USER_REQUEST]]
`;

export function prototyper(_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const parentName = _options.name;
    const userPrompt = _options.prompt;
    const style = _options.style || 'scss';
    const styleLanguage = style.toUpperCase();

    // The child component name will now be determined by the LLM.
    
    // --- Step 1: Create the full prompt and call the LLM
    const fullPrompt = promptTemplate
      .replace('[[COMPONENT_NAME]]', parentName)
      .replace('[[STYLE_EXTENSION]]', style)
      .replace('[[STYLE_LANGUAGE]]', styleLanguage)
      .replace('[[USER_REQUEST]]', userPrompt);

    let fullCodeString: string;
    try {
      _context.logger.info(`Sending prompt to Gemini...`);
      fullCodeString = await generateComponentCode(fullPrompt);
      _context.logger.info(`LLM Response received for component "${parentName}".`);
      // Log the raw LLM response for debugging purposes
      // _context.logger.info(`Raw LLM Response:\n${fullCodeString}`);
    } catch (error) {
      _context.logger.error(`Failed to generate code: ${error.message}`);
      return tree;
    }
    
    // --- Step 2: Parse and write the files for all generated components
    const components = parseGeneratedCode(fullCodeString);

    if (!components.length) {
      _context.logger.error('Failed to parse component code from LLM output. No components were generated.');
      return tree;
    }

    let mainComponentName: string | null = null;
    let mainComponentPath: string | null = null;
    let modulePath = await findModuleFromOptions(tree, _options);
    let sourceRoot = modulePath ? modulePath.substring(1, modulePath.indexOf('/app/app.module.ts')) : 'src';
    const appComponentPath = `${sourceRoot}/app/app.component.ts`;
    const appHtmlPath = `${sourceRoot}/app/app.component.html`;
    const appModulePath = `${sourceRoot}/app/app.module.ts`;

    for (const comp of components) {
      // The `writeOrOverwriteFile` function handles both creating and overwriting files.
      // It will also handle creating the parent directories if they don't exist.
      const fullPath = normalize(`${sourceRoot}/app/${comp.path}`);
      writeOrOverwriteFile(tree, fullPath, getFileContent(comp.path, comp));
      
      // We'll consider the first component generated to be the main one
      if (!mainComponentName) {
        mainComponentName = strings.classify(comp.name);
        // Correctly construct the relative path to ensure the leading './' is present.
        mainComponentPath = `./${comp.path.split('.')[0]}.component`;
      }
    }

    _context.logger.info(`✅ Generated ${components.length} component files.`);
    
    // --- Step 3: Add the main component to the nearest module or app component
    if (mainComponentName) {
      let importFilePath = null;
      let importFunctionName = null;
      
      if (tree.exists(appModulePath)) {
        // We have a traditional module-based project
        importFilePath = appModulePath;
        importFunctionName = addImportToModule;
        _context.logger.info(`✅ Found a traditional NgModule project. Adding component to ${appModulePath}.`);
      } else if (tree.exists(appComponentPath)) {
        // We have a standalone project
        importFilePath = appComponentPath;
        importFunctionName = addImportToModule;
        _context.logger.info(`✅ Found a standalone project. Adding component to ${appComponentPath}.`);
      } else {
        _context.logger.warn(`⚠️ Could not find either app.module.ts or app.component.ts. Cannot add the component automatically.`);
        return tree;
      }
      
      const source = tree.read(importFilePath)!.toString('utf-8');
      const tsSourceFile = ts.createSourceFile(importFilePath, source, ts.ScriptTarget.Latest, true);

      const recorder = tree.beginUpdate(importFilePath);
      let changes: Change[] = [];
      
      // Use the appropriate function to add the component
      changes = importFunctionName(tsSourceFile, importFilePath, `${mainComponentName}Component`, `${mainComponentPath}`);

      for (const change of changes) {
        if (change instanceof InsertChange) {
          recorder.insertLeft(change.pos, change.toAdd);
        }
      }
      tree.commitUpdate(recorder);

      _context.logger.info(`✅ Component "${mainComponentName}Component" added to imports of "${importFilePath}".`);

      // Now, add the component selector to app.component.html
      if (tree.exists(appHtmlPath)) {
        const appComponentContent = tree.read(appHtmlPath)!.toString('utf-8');
        const selector = `app-${strings.dasherize(mainComponentName)}`;
        
        const newContent = `${appComponentContent}\n<${selector}></${selector}>\n`;
        
        tree.overwrite(appHtmlPath, newContent);
        _context.logger.info(`✅ Added component selector "<${selector}>" to "${appHtmlPath}".`);
      } else {
        _context.logger.warn(`⚠️ Could not find app.component.html to add the component selector.`);
      }
    } else {
      _context.logger.warn(`⚠️ No main component found. Cannot perform automatic import.`);
    }

    return tree;
  };

  /**
   * Helper function to determine the correct file content based on the file path.
   */
  function getFileContent(filePath: string, comp: any): string {
    if (filePath.endsWith('.ts')) {
      return comp.ts;
    } else if (filePath.endsWith('.html')) {
      return comp.html;
    } else if (filePath.endsWith('.scss') || filePath.endsWith('.css')) {
      return comp.style;
    }
    return '';
  }

  /**
   * Writes content to a file, creating parent directories if they don't exist.
   */
  function writeOrOverwriteFile(tree: Tree, filePath: string, content: string) {
    if (tree.exists(filePath)) {
      tree.overwrite(filePath, content);
    } else {
      tree.create(filePath, content);
    }
  }
}
