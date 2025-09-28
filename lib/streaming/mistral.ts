import { Sandbox } from "@e2b/desktop";
import { Mistral } from "@mistralai/mistralai";
import { SSEEventType, SSEEvent, sleep } from "@/types/api";
import {
  ComputerInteractionStreamerFacade,
  ComputerInteractionStreamerFacadeStreamProps,
} from "@/lib/streaming";
import { ActionResponse } from "@/types/api";
import { ResolutionScaler } from "./resolution";
import { MistralComputerAction } from "@/types/mistral";
import { logError, logDebug } from "../logger";

const INSTRUCTIONS = `
You are Surf, a helpful assistant that can use a computer to help the user with their tasks.
You can use the computer to search the web, write code, and more.

Surf is built by E2B, which provides an open source isolated virtual computer in the cloud made for AI use cases.
This application integrates E2B's desktop sandbox with Mistral AI's API to create an AI agent that can perform tasks
on a virtual computer through natural language instructions.

The screenshots that you receive are from a running sandbox instance, allowing you to see and interact with a real
virtual computer environment in real-time.

Since you are operating in a secure, isolated sandbox micro VM, you can execute most commands and operations without
worrying about security concerns. This environment is specifically designed for AI experimentation and task execution.

The sandbox is based on Ubuntu 22.04 and comes with many pre-installed applications including:
- Firefox browser
- Visual Studio Code
- LibreOffice suite
- Python 3 with common libraries
- Terminal with standard Linux utilities
- File manager (PCManFM)
- Text editor (Gedit)
- Calculator and other basic utilities

IMPORTANT NOTES:
1. You automatically receive a screenshot after each action you take. You DO NOT need to request screenshots separately.
2. When a user asks you to run a command in the terminal, ALWAYS press Enter immediately after typing the command.
3. When the user explicitly asks you to press any key (Enter, Tab, Ctrl+C, etc.) in any application or interface,
   you MUST do so immediately.
4. Remember: In terminal environments, commands DO NOT execute until Enter is pressed.
5. When working on complex tasks, continue to completion without stopping to ask for confirmation.
   Break down complex tasks into steps and execute them fully.

IMPORTANT: It is okay to run terminal commands at any point without confirmation, as long as they are required to fulfill the task the user has given. You should execute commands immediately when needed to complete the user's request efficiently.

IMPORTANT: When typing commands in the terminal, ALWAYS send a KEYPRESS ENTER action immediately after typing the command to execute it. Terminal commands will not run until you press Enter.

IMPORTANT: When editing files, prefer to use Visual Studio Code (VS Code) as it provides a better editing experience with syntax highlighting, code completion, and other helpful features.

Please help the user effectively by observing the current state of the computer and taking appropriate actions.
`;

export class MistralComputerStreamer
  implements ComputerInteractionStreamerFacade
{
  public instructions: string;
  public desktop: Sandbox;
  public resolutionScaler: ResolutionScaler;
  private mistral: Mistral;

  constructor(desktop: Sandbox, resolutionScaler: ResolutionScaler) {
    // Hardcoded Mistral API key as requested
    const apiKey = "E59RGCbtwmo5ANpiZTeL8lpOzJF2fEkc";

    this.desktop = desktop;
    this.resolutionScaler = resolutionScaler;
    this.mistral = new Mistral({ apiKey });
    this.instructions = INSTRUCTIONS;
  }

  async executeAction(
    action: MistralComputerAction
  ): Promise<ActionResponse | void> {
    const desktop = this.desktop;

    switch (action.action) {
      case "screenshot": {
        // Screenshots are automatic after each action
        break;
      }

      case "double_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );
        if (action.text) {
          await desktop.moveMouse(x, y);
          await desktop.press(action.text);
        }
        await desktop.doubleClick(x, y);
        break;
      }

      case "triple_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );

        await desktop.moveMouse(x, y);
        if (action.text) {
          await desktop.press(action.text);
        }
        await desktop.leftClick();
        await desktop.leftClick();
        await desktop.leftClick();
        break;
      }

      case "left_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );

        if (action.text) {
          await desktop.moveMouse(x, y);
          await desktop.press(action.text);
        }
        await desktop.leftClick(x, y);
        break;
      }

      case "right_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );

        if (action.text) {
          await desktop.moveMouse(x, y);
          await desktop.press(action.text);
        }
        await desktop.rightClick(x, y);
        break;
      }

      case "middle_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );

        if (action.text) {
          await desktop.moveMouse(x, y);
          await desktop.press(action.text);
        }
        await desktop.middleClick(x, y);
        break;
      }

      case "type": {
        await desktop.write(action.text);
        break;
      }

      case "key": {
        await desktop.press(action.text);
        break;
      }

      case "hold_key": {
        await desktop.press(action.text);
        // Note: duration not directly supported by E2B, using simple press
        break;
      }

      case "mouse_move": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );
        await desktop.moveMouse(x, y);
        break;
      }

      case "scroll": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );
        await desktop.moveMouse(x, y);
        
        if (action.scroll_direction === "up") {
          await desktop.scroll("up", action.scroll_amount);
        } else if (action.scroll_direction === "down") {
          await desktop.scroll("down", action.scroll_amount);
        }
        break;
      }

      case "left_click_drag": {
        const [startX, startY] = this.resolutionScaler.scaleToOriginalSpace(
          action.start_coordinate
        );
        const [endX, endY] = this.resolutionScaler.scaleToOriginalSpace(
          action.coordinate
        );
        await desktop.drag([startX, startY], [endX, endY]);
        break;
      }

      case "wait": {
        await sleep(action.duration * 1000);
        break;
      }

      case "left_mouse_down":
      case "left_mouse_up":
      case "cursor_position":
        // These actions don't have direct E2B equivalents
        break;

      default: {
        logError("MISTRAL_STREAMER", `Unknown action type: ${(action as any).action}`);
      }
    }
  }

  async *stream(
    props: ComputerInteractionStreamerFacadeStreamProps
  ): AsyncGenerator<SSEEvent<"mistral">> {
    const { messages, signal } = props;

    const mistralMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    try {
      while (true) {
        if (signal?.aborted) {
          yield {
            type: SSEEventType.DONE,
            content: "Generation stopped by user",
          };
          break;
        }

        const modelResolution = this.resolutionScaler.getScaledResolution();

        // Define the computer tool for Mistral
        const computerTool = {
          type: "function" as const,
          function: {
            name: "computer",
            description: "Control the computer by performing various actions like clicking, typing, scrolling, etc.",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "left_click",
                    "right_click",
                    "middle_click",
                    "double_click",
                    "triple_click",
                    "type",
                    "key",
                    "hold_key",
                    "mouse_move",
                    "scroll",
                    "left_click_drag",
                    "screenshot",
                    "wait",
                  ],
                  description: "The type of action to perform",
                },
                coordinate: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                  description: "X,Y coordinate for mouse actions",
                },
                start_coordinate: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                  description: "Starting X,Y coordinate for drag actions",
                },
                text: {
                  type: "string",
                  description: "Text to type or key to press",
                },
                scroll_direction: {
                  type: "string",
                  enum: ["up", "down", "left", "right"],
                  description: "Direction to scroll",
                },
                scroll_amount: {
                  type: "number",
                  description: "Amount to scroll",
                },
                duration: {
                  type: "number",
                  description: "Duration in seconds for wait or hold actions",
                },
              },
              required: ["action"],
            },
          },
        };

        // Get screenshot first
        const screenshot = await this.desktop.screenshot();
        const screenshotInstruction = `Current screenshot of the desktop (${modelResolution[0]}x${modelResolution[1]}): data:image/png;base64,${screenshot}`;

        const response = await this.mistral.chat.stream({
          model: "mistral-medium-2505",
          messages: [
            { role: "system", content: this.instructions },
            ...mistralMessages,
            { role: "user", content: screenshotInstruction },
          ],
          tools: [computerTool],
        });

        let assistantMessage = "";
        let toolCalls: any[] = [];

        for await (const event of response) {
          if (signal?.aborted) {
            yield {
              type: SSEEventType.DONE,
              content: "Generation stopped by user",
            };
            return;
          }

          const chunk = event.data;
          const choice = chunk.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;

          if (delta.content) {
            const content = typeof delta.content === 'string' ? delta.content : JSON.stringify(delta.content);
            assistantMessage += content;
            yield {
              type: SSEEventType.UPDATE,
              content: content,
            };
          }

          if (delta.toolCalls) {
            toolCalls.push(...delta.toolCalls);
          }

          if (choice.finishReason === "tool_calls") {
            // Execute tool calls
            for (const toolCall of toolCalls) {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                
                yield {
                  type: SSEEventType.ACTION,
                  action: args as MistralComputerAction,
                };

                await this.executeAction(args as MistralComputerAction);

                yield {
                  type: SSEEventType.ACTION_COMPLETED,
                };

                // Get new screenshot after action
                const newScreenshot = await this.desktop.screenshot();
                const newScreenshotInstruction = `Updated screenshot after action (${modelResolution[0]}x${modelResolution[1]}): data:image/png;base64,${newScreenshot}`;
                
                mistralMessages.push({
                  role: "assistant",
                  content: assistantMessage || "I performed the requested action.",
                });
                mistralMessages.push({
                  role: "user",
                  content: newScreenshotInstruction,
                });
              } catch (error) {
                logError("MISTRAL_STREAMER", `Error executing action: ${error}`);
                yield {
                  type: SSEEventType.ERROR,
                  content: `Error executing action: ${error}`,
                };
              }
            }
            
            // Reset for next iteration
            assistantMessage = "";
            toolCalls = [];
          } else if (choice.finishReason === "stop") {
            if (assistantMessage) {
              mistralMessages.push({
                role: "assistant",
                content: assistantMessage,
              });
            }
            yield {
              type: SSEEventType.DONE,
              content: assistantMessage,
            };
            break;
          }
        }
      }
    } catch (error) {
      logError("MISTRAL_STREAMER", error);
      yield {
        type: SSEEventType.ERROR,
        content: "An error occurred with the Mistral AI service. Please try again.",
      };
    }
  }
}