import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

export interface AnalysisResult {
  issues: CodeIssue[];
  suggestions: string[];
  score: number;
}

export interface CodeIssue {
  type: 'bug' | 'performance' | 'security' | 'style' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  message: string;
  suggestion?: string;
}

interface AnthropicResponse {
  content: Array<{
    text: string;
    type: string;
  }>;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AICodeAnalyzer {
  private config: vscode.WorkspaceConfiguration; 

  constructor() {
    this.config = vscode.workspace.getConfiguration('aiCodeReview');
  }

  async analyzeCode(code: string, language: string, analysisType: string = 'general'): Promise<AnalysisResult> {
    const apiProvider = this.config.get<string>('apiProvider') || 'anthropic';
    const apiKey = this.config.get<string>('apiKey');

    if (!apiKey) {
      throw new Error('API key not configured. Please set aiCodeReview.apiKey in settings.');
    }
    if (code.length > 50000) {
      throw new Error('Code is too long for analysis. Please select a smalling portion');
    }

    try {
      if (apiProvider === 'anthropic') {
        return await this.analyzeWithAnthropic(code, language, analysisType, apiKey)
      } else {
        return await this.analyzeWithOpenAI(code, language, analysisType, apiKey)
      }  
    } catch (error) {
      console.error ('AI Analysis error:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status == 401) {
          throw new Error('Invalid API key. Please check your configuration.');
        } else if (status == 429) {
          throw new Error('Rate limit exceeded. Please try again later');
        } else if (status == 500) {
          throw new Error('AI service is currently unavailable. Please try again later')
        } 
      }
      throw new Error('FAiled to analyze code with AI service'); 
    }
  }

  private async analyzeWithAnthropic(code: string, language: string, analysisType: string, apiKey: string): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(code, language, analysisType);
    const maxTokens = this.config.get<number>('maxTokens') || 4000;
    const model = this.config.get<string>('model') || 'claude-3-sonnet-20240229';

    const response: AxiosResponse<AnthropicResponse> = await axios.post(
      'https://api.anthropic.com/v1/messages', 
      {
        model: model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000
      }
    );

    return this.parseAnalysisResponse(response.data.content[0].text);
  }

  private async analyzeWithOpenAI(code: string, language: string, analysisType: string, apiKey: string): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(code, language, analysisType);
    const maxTokens = this.config.get<number>('maxTokens') || 4000;
    const temperature = this.config.get<number>('temperature') || 0.1;

    const response: AxiosResponse<OpenAIResponse> = axios.post (
      'https://api.openai.com/v1/chat/completions',
      {
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
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return this.parseAnalysisResponse(response.data.choices[0].message.content);
  }

  private buildPrompt(code: string, language: string, analysisType: string): string {
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
    }
  }
}