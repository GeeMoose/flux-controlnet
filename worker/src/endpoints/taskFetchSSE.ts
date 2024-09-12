import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';

import { Bindings, TaskStatus, Variables } from '../types';

export class FetchTaskSSE extends OpenAPIRoute {
	schema = {
		summary: '获取任务状态 SSE',
		description: `获取任务状态，如果成功同时返回图片地址.`,
		request: {
			params: z.object({
				id: z.string().nanoid(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const headers: Record<string, string> = {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		};
		Object.keys(headers).forEach((key) => {
			c.header(key, headers[key]);
		});

		const { readable, writable } = new TransformStream();

		const enc = new TextEncoder();

		const writer = writable.getWriter();
		const fetchData = async (writer: WritableStreamDefaultWriter) => {
			let interval = 1000; // 初始间隔时间
			const increment = 0; // 每次增加的时间间隔
			const maxInterval = 1000; // 最大间隔时间
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, interval));
				interval = Math.min(interval + increment, maxInterval);
				try {
					const result = await c.var.stub.getStatus(data.params.id);
					if (!result.id) {
						console.log('Task not found');
						writer.write(enc.encode('data: {"error": "Task not found"}\n\n'));
						return writer.close();
					}
					console.log('result:', result);
					writer.write(enc.encode('data: ' + JSON.stringify(result) + '\n\n'));
					if (result.status === TaskStatus.FINISHED || result.status === TaskStatus.FAILED || result.status === TaskStatus.UNKNOWN) {
						console.log('Task status: ', result.status);
						return writer.close();
					} else {
						console.log('Task not finished');
					}
				} catch (error) {
					console.error('Error fetching data:', error);
				}
			}
		};
		fetchData(writer);

		return c.body(readable);
	}
}
