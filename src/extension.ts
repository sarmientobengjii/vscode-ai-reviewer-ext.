import * as vscode from 'vscode';
import { AICodeAnalyzer } from './aiCodeAnalyzer';

export function activate(context: vscode.ExtensionContext) {
  console.log('Hello Master, what can I do for you?');

  const analyzer = new AICodeAnalyzer();

  
}