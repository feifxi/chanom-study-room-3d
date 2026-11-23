import { TODO_MAX } from '@connecta/shared';
import { z } from 'zod';

export const TodoSchema = z.object({ id: z.string(), text: z.string(), done: z.boolean() }).meta({ id: 'Todo' });
export type Todo = z.infer<typeof TodoSchema>;

export const TodoListSchema = z.object({ todos: z.array(TodoSchema) }).meta({ id: 'TodoList' });
export type TodoList = z.infer<typeof TodoListSchema>;

export const AddTodoBodySchema = z.object({ text: z.string().trim().min(1).max(TODO_MAX) });
export const TickTodoBodySchema = z.object({ done: z.boolean() });
