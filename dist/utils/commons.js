"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNameSuggestions = void 0;
const generateNameSuggestions = (baseName, count = 10) => {
    const suffixes = Array.from({ length: count }, () => Math.floor(Math.random() * 9000 + 1000));
    const suggestions = suffixes
        .slice(0, count)
        .map(suffix => `${baseName}${suffix}`);
    return [baseName, ...suggestions];
};
exports.generateNameSuggestions = generateNameSuggestions;
