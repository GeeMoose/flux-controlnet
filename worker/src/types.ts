import { convertParams } from 'chanfana';
import { z } from 'zod';
import { TaskStatusDurableObject } from './durableObjects';

// FileBody
interface ParameterType {
	default?: string | number | boolean;
	description?: string;
	example?: string | number | boolean;
	required?: boolean;
	deprecated?: boolean;
}
interface StringParameterType extends ParameterType {
	format?: string;
}
export function FileBody(params?: StringParameterType): z.ZodString {
	return convertParams<z.ZodString>(z.string(), params);
}

// 导入自动生成的 worker-configuration.d.ts
type NewEnv = Omit<Env, 'TASK_STATUS_DURABLE_OBJECT'> & {
	TASK_STATUS_DURABLE_OBJECT: DurableObjectNamespace<TaskStatusDurableObject>;
};
export type Bindings = Pick<NewEnv, keyof NewEnv>;

export type Variables = {
	stub: DurableObjectStub<TaskStatusDurableObject>;
};

// Task
export enum TaskStatus {
	FAILED = 'FAILED',
	WAITING = 'WAITING',
	PROCESSING = 'PROCESSING',
	FINISHED = 'FINISHED',
	UNKNOWN = 'UNKNOWN',
}

export type TaskStatusResult = {
	id: string;
	status: TaskStatus;
	image_url?: string;
	thumb_url?: string;
	progress?: string;
	timestamp: number;
};

// Cache
export type CacheHandler = {
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string, ttl?: number) => Promise<void>;
	del: (key: string) => Promise<void>;
};
