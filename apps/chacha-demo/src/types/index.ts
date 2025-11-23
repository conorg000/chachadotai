export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  name: string;
  result: any;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  permissions: string[];
  snippet: string;
}

export type MessageType = 'user' | 'assistant' | 'tool';

export interface BaseMessage {
  id: number;
  type: MessageType;
  timestamp: string;
  threatLevel?: 'none' | 'low' | 'medium' | 'high';
}

export interface UserMessage extends BaseMessage {
  type: 'user';
  content: string;
}

export interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolMessage extends BaseMessage {
  type: 'tool';
  toolName: string;
  result: ToolResult;
  document?: Document;
}

export type Message = UserMessage | AssistantMessage | ToolMessage;

export interface Scenario {
  title: string;
  description: string;
  messages: Message[];
}

