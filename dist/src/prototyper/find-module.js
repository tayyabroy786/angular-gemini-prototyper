"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findModuleFromOptions = findModuleFromOptions;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
// Helper function to find the nearest module
function findModuleFromOptions(tree, options) {
    if (options.skipImport) {
        return null;
    }
    if (options.module) {
        return options.module;
    }
    // Look for angular.json inside the virtual Tree
    const angularJsonPath = '/angular.json';
    if (!tree.exists(angularJsonPath)) {
        throw new schematics_1.SchematicsException('Could not find "angular.json". Make sure you are running the schematic inside an Angular workspace.');
    }
    const workspaceConfigBuffer = tree.read(angularJsonPath);
    if (!workspaceConfigBuffer) {
        throw new schematics_1.SchematicsException('Could not read angular.json file.');
    }
    const workspaceConfig = JSON.parse(workspaceConfigBuffer.toString());
    const projectName = options.project || workspaceConfig.defaultProject;
    const projectConfig = workspaceConfig.projects[projectName];
    if (!projectConfig) {
        throw new schematics_1.SchematicsException(`Could not find project "${projectName}" in angular.json.`);
    }
    const sourceRoot = projectConfig.sourceRoot || 'src';
    const appModulePath = (0, core_1.normalize)(`/${sourceRoot}/app/app.module.ts`);
    if (!tree.exists(appModulePath)) {
        // Optionally: create app.module.ts if it doesn’t exist
        return null;
    }
    return appModulePath;
}
//# sourceMappingURL=find-module.js.map