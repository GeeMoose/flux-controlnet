import { OpenAPIRoute, contentJson } from 'chanfana';
import { Context } from 'hono';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import { Bindings, TaskStatus } from '../types';

const PREMIUM_SCALE = 8;

const isPremium = (jwtPayload: any) => {
	return !!jwtPayload.experimentalPremiumAccess; // TODO...
};
const isNeedPremiun = () => {
	return false; // TODO...
};

export class CreateTask extends OpenAPIRoute {
	schema = {
		summary: '新建任务',
		description:
			'新建一个任务，把任务发送到 Queue 中等待处理。<br> id为可选项，需要上传nanoid，如果不上传则后端自动生成。',

		request: {
			body: contentJson({
				id: z.string().nanoid().optional(),
				prompt: z.string(),
				lora_name: z.string(),
				cover_size: z.string(),
				// image_url: z.string().url(),
			}),
		},
	};

	async handle(c: Context<{ Bindings: Bindings }>) {
		const data = await this.getValidatedData<typeof this.schema>();
		const jwtPayload = c.get('jwtPayload');
		if (isPremium(jwtPayload) === false && isNeedPremiun()) {
			return c.json({ error: 'Premium Access Required' }, { status: 403 });
		}

		const task_id = data.body.id || nanoid();

		const doId = c.env.TASK_STATUS_DURABLE_OBJECT.idFromName('a1d-flux-task-status');
		const stub = c.env.TASK_STATUS_DURABLE_OBJECT.get(doId);
		const status = await stub.getStatus(data.body.id);
		if (status?.id) {
			return c.json({ error: 'Task already exist' }, { status: 409 });
		}

		const client = new SQSClient({
			region: c.env.AWS_REGION,
			credentials: {
				// use wrangler secrets to provide these global variables
				accessKeyId: c.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		const prompt = data.body.prompt;
		const lora_name = data.body.lora_name;
		const cover_size = data.body.cover_size;
		const msg = {
			prompt,
			lora_name,
			cover_size,
			task_id,
			authorization: c.req.header('Authorization'),
		};
		const send = new SendMessageCommand({
			QueueUrl: c.env.AWS_SQS_QUEUE_URL,
			MessageBody: JSON.stringify(msg),
		});

		await client.send(send);

		c.env.BILLING?.writeDataPoint({
			blobs: [jwtPayload.experimentalPremiumAccess, prompt, lora_name, cover_size],
			doubles: [],
			indexes: [jwtPayload.userId],
		});

		const result = await stub.setStatus(task_id, {
			id: task_id,
			status: TaskStatus.WAITING,
			timestamp: Date.now(),
		});

		return c.json(result);
	}
}
