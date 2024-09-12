import { DurableObject } from 'cloudflare:workers';
import { TaskStatusResult } from './types';

const CACHE_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export class TaskStatusDurableObject extends DurableObject {
	private value: Record<string, TaskStatusResult>;
	constructor(state: DurableObjectState, env: unknown) {
		super(state, env);
		this.value = {};
	}

	getStatus(id: string) {
		return this.value[id] || {};
	}

	setStatus(id: string, status: TaskStatusResult) {
		const newValue = Object.assign(this.getStatus(id), status) as TaskStatusResult;
		this.value[id] = newValue;
		this.ctx.storage.getAlarm().then((currentAlarm) => {
			if (currentAlarm == null) {
				return this.ctx.storage.setAlarm(Date.now() + CACHE_EXPIRATION_TIME);
			}
		});
		return newValue;
	}

	// TaskStatusResult has a timestamp, so we can use it to clean up old data
	cleanUpOldData() {
		const now = Date.now();
		const ids = Object.keys(this.value);
		for (const id of ids) {
			if (now - this.value[id].timestamp > CACHE_EXPIRATION_TIME) {
				delete this.value[id];
			}
		}
	}

	async alarm() {
		this.cleanUpOldData();
		await this.ctx.storage.setAlarm(Date.now() + CACHE_EXPIRATION_TIME);
	}
}
