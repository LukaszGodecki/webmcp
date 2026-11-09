import {
  DestroyRef,
  WebMcpToolDescriptor,
  declareExperimentalWebMcpTool,
  inject,
} from '@angular/core';
import { WebMcpActivityService } from './webmcp-activity.service';

/**
 * Registers a WebMCP tool via Angular's `declareExperimentalWebMcpTool` and records every
 * invocation in {@link WebMcpActivityService} so it can be shown in the demo panel.
 *
 * Must be called in an injection context – the tool is unregistered when it is destroyed.
 */
export function declareLoggedTool<const InputSchema extends object>(
  tool: WebMcpToolDescriptor<InputSchema>,
): void {
  const activity = inject(WebMcpActivityService);
  const { execute } = tool;

  activity.addTool({ name: tool.name, description: tool.description, kind: 'manual' });
  inject(DestroyRef).onDestroy(() => activity.removeTool(tool.name));

  declareExperimentalWebMcpTool<InputSchema>({
    ...tool,
    execute: async (args, client) => {
      const id = activity.start(tool.name, args);
      try {
        const result = await execute(args, client);
        activity.finish(id, 'success', result);
        return result;
      } catch (error) {
        activity.finish(id, 'error', error);
        throw error;
      }
    },
  }).then(
    () => activity.registrationSettled(tool.name),
    (error: unknown) => activity.registrationSettled(tool.name, error ?? 'Unknown error'),
  );
}
