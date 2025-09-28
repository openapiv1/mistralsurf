/**
 * Type definitions for Mistral AI-related functionality
 */

// Coordinate type for mouse actions
type Coordinate = [number, number];

// Base interface for computer actions
interface ComputerActionBase {
  action: string;
}

// Specific action types compatible with Mistral AI
interface KeyAction extends ComputerActionBase {
  action: "key";
  text: string;
}

interface HoldKeyAction extends ComputerActionBase {
  action: "hold_key";
  text: string;
  duration: number;
}

interface TypeAction extends ComputerActionBase {
  action: "type";
  text: string;
}

interface CursorPositionAction extends ComputerActionBase {
  action: "cursor_position";
}

interface MouseMoveAction extends ComputerActionBase {
  action: "mouse_move";
  coordinate: Coordinate;
}

interface LeftMouseDownAction extends ComputerActionBase {
  action: "left_mouse_down";
}

interface LeftMouseUpAction extends ComputerActionBase {
  action: "left_mouse_up";
}

interface LeftClickAction extends ComputerActionBase {
  action: "left_click";
  coordinate: Coordinate;
  text?: string;
}

interface LeftClickDragAction extends ComputerActionBase {
  action: "left_click_drag";
  start_coordinate: Coordinate;
  coordinate: Coordinate;
}

interface RightClickAction extends ComputerActionBase {
  action: "right_click";
  coordinate: Coordinate;
  text?: string;
}

interface MiddleClickAction extends ComputerActionBase {
  action: "middle_click";
  coordinate: Coordinate;
  text?: string;
}

interface DoubleClickAction extends ComputerActionBase {
  action: "double_click";
  coordinate: Coordinate;
  text?: string;
}

interface TripleClickAction extends ComputerActionBase {
  action: "triple_click";
  coordinate: Coordinate;
  text?: string;
}

interface ScrollAction extends ComputerActionBase {
  action: "scroll";
  coordinate: Coordinate;
  scroll_direction: "up" | "down" | "left" | "right";
  scroll_amount: number;
  text?: string;
}

interface WaitAction extends ComputerActionBase {
  action: "wait";
  duration: number;
}

interface ScreenshotAction extends ComputerActionBase {
  action: "screenshot";
}

// Union type for all Mistral computer actions
export type MistralComputerAction =
  | KeyAction
  | HoldKeyAction
  | TypeAction
  | CursorPositionAction
  | MouseMoveAction
  | LeftMouseDownAction
  | LeftMouseUpAction
  | LeftClickAction
  | LeftClickDragAction
  | RightClickAction
  | MiddleClickAction
  | DoubleClickAction
  | TripleClickAction
  | ScrollAction
  | WaitAction
  | ScreenshotAction;

// Text editor command interfaces for str_replace_editor tool
interface TextEditorCommandBase {
  command: string;
  path: string;
}

interface ViewCommand extends TextEditorCommandBase {
  command: "view";
  view_range?: [number, number];
}

interface CreateCommand extends TextEditorCommandBase {
  command: "create";
  file_text: string;
}

interface StrReplaceCommand extends TextEditorCommandBase {
  command: "str_replace";
  old_str: string;
  new_str?: string;
}

interface InsertCommand extends TextEditorCommandBase {
  command: "insert";
  insert_line: number;
  new_str: string;
}

interface UndoEditCommand extends TextEditorCommandBase {
  command: "undo_edit";
}

export type MistralTextEditorCommand =
  | ViewCommand
  | CreateCommand
  | StrReplaceCommand
  | InsertCommand
  | UndoEditCommand;

// Bash command type for bash tool
export type MistralBashCommand =
  | {
      command: string;
      restart?: never;
    }
  | {
      command?: never;
      restart: true;
    };

// Union type for all tool inputs
export type MistralToolInput =
  | { name: "computer"; input: MistralComputerAction }
  | { name: "str_replace_editor"; input: MistralTextEditorCommand }
  | { name: "bash"; input: MistralBashCommand };

// Mistral AI message types
export interface MistralMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Mistral function call structure
export interface MistralToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Mistral tool definition
export interface MistralTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// Mistral stream response chunk
export interface MistralStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: MistralToolCall[];
    };
    finish_reason?: string;
  }>;
}