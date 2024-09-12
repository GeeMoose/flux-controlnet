import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';

import { Bindings, TaskStatus, Variables } from '../types';

export class FetchTask extends OpenAPIRoute {
	schema = {
		summary: '获取任务状态',
		description: `获取任务状态，如果成功同时返回图片地址.同时支持 WebSocket 连接，通过 WebSocket 连接可以实时获取任务状态.

\`\`\`javascript
socket = new WebSocket('ws://localhost:8787/task/:id/ws')
socket.onmessage = console.log
socket.send('start')
\`\`\`
`,
		request: {
			params: z.object({
				id: z.string().nanoid(),
			}),
		},
		response: {
			200: z.object({
				id: z.string(),
				status: z.union([
					z.literal(TaskStatus.WAITING),
					z.literal(TaskStatus.PROCESSING),
					z.literal(TaskStatus.FINISHED),
					z.literal(TaskStatus.UNKNOWN),
				]),
				image_url: z.string().optional(),
				thumb_url: z.string().optional(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const result = await c.var.stub.getStatus(data.params.id);
		return c.json(result);
	}
}
