import { OpenAPIRoute, contentJson } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';

import { Bindings, TaskStatus, Variables } from '../types';

export class UpdateTask extends OpenAPIRoute {
	schema = {
		summary: '更新任务',
		description: '服务器 Webhook，更新任务状态\n 支持的 status 有 PROCESSING, FINISHED, FAILED\n',

		request: {
			params: z.object({
				id: z.string().nanoid(),
			}),
			body: contentJson({
				status: z.union([z.literal(TaskStatus.FINISHED), z.literal(TaskStatus.FAILED), z.literal(TaskStatus.PROCESSING)]),
				progress: z.number().int().min(0).max(100).optional(),
				image_url: z.string().url().optional(),
				thumb_url: z.string().url().optional(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const task_id = data.params.id;

		const url = new URL(c.req.url);
		const img_url = new URL(data.body.image_url);

		await c.var.stub.setStatus(task_id, {
			id: task_id,
			status: data.body.status,
			progress: data.body.progress,
			image_url: data.body.image_url,
			thumb_url: data.body.image_url && url.origin + '/cdn-cgi/image/width=200,quality=75/api/uploads/' + img_url.pathname.split('/').pop(),
			timestamp: Date.now(),
		});
		const result = await c.var.stub.getStatus(task_id);

		return c.json(result);
	}
}
