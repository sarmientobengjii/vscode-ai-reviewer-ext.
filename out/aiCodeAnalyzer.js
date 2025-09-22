"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICodeAnalyzer = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
class AICodeAnalyzer {
    constructor() {
        this.config = vscode.workspace.getConfiguration('aiCodeReview');
    }
    async analyzeCode(code, language, analysisType = 'general') {
        const apiProvider = this.config.get('apiProvider') || 'anthropic';
        const apiKey = this.config.get('apiKey');
        if (!apiKey) {
            throw new Error('API key not configured. Please set aiCodeReview.apiKey in settings.');
        }
        if (code.length > 50000) {
            throw new Error('Code is too long for analysis. Please select a smalling portion');
        }
        try {
            if (apiProvider === 'anthropic') {
                return await this.analyzeWithAnthropic(code, language, analysisType, apiKey);
            }
            else {
                return await this.analyzeWithOpenAI(code, language, analysisType, apiKey);
            }
        }
        catch (error) {
            console.error('AI Analysis error:', error);
            if (axios_1.default.isAxiosError(error)) {
                const status = error.response?.status;
                if (status == 401) {
                    throw new Error('Invalid API key. Please check your configuration.');
                }
                else if (status == 429) {
                    throw new Error('Rate limit exceeded. Please try again later');
                }
                else if (status == 500) {
                    throw new Error('AI service is currently unavailable. Please try again later');
                }
            }
            throw new Error('FAiled to analyze code with AI service');
        }
    }
    async analyzeWithAnthropic(code, language, analysisType, apiKey) {
        const prompt = this.buildPrompt(code, language, analysisType);
        const maxTokens = this.config.get('maxTokens') || 4000;
        const model = this.config.get('model') || 'claude-3-sonnet-20240229';
        const response = await axios_1.default.post('https://api.anthropic.com/v1/messages', {
            model: model,
            max_tokens: maxTokens,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: 60000
        });
        return this.parseAnalysisResponse(response.data.content[0].text);
    }
    async analyzeWithOpenAI(code, language, analysisType, apiKey) {
        const prompt = this.buildPrompt(code, language, analysisType);
        const maxTokens = this.config.get('maxTokens') || 4000;
        const temperature = this.config.get('temperature') || 0.1;
        const response = axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code reviewer, security analyst, and performance optimization specialist'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: temperature
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        return this.parseAnalysisResponse(response.data.choices[0].message.content);
    }
    buildPrompt(code, language, analysisType) {
        const prompts = {
            general: `Perform a comprehensive code review of this ${language} code. Analyze for:
                - Potential bugs and logical errors
                - Code quality and best practices
                - Maintainability issues
                - Styles and readability concerns
                Provide specific line numbers and actionable suggestions.`,
            security: `Conduct a thorough security analysis of this ${language} code. Look for:
                - SQL injections vulnerabilities
                - Cross-site scripting (XSS) risks
                - Input validation issues
                - Sensitive data exposure
                - Insecure cryptographic practices
                - Path traversal vulnerabilities
                Identify specific security risks with their severity levels.`,
            performance
        };
    }
}
exports.AICodeAnalyzer = AICodeAnalyzer;
//# sourceMappingURL=aiCodeAnalyzer.js.map