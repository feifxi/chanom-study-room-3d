import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { z } from 'zod';
import { AddTodoBodySchema, TickTodoBodySchema, TodoListSchema, TodoSchema, type Todo, type TodoList } from './todos.schemas.js';
import { TodosService } from './todos.service.js';

const Id = { schema: z.string().max(40) };

/** Your to-do list: private, the same in every room. Full accounts only. */
@ApiTags('todos')
@Controller('todos')
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  @ApiOkResponse({ standardSchema: TodoListSchema })
  list(@Session() session: UserSession): Promise<TodoList> {
    return this.todos.list(session.user.id);
  }

  /** Added last; 409 `full` at 50 items. */
  @Post()
  @ApiCreatedResponse({ standardSchema: TodoSchema })
  @ApiConflictResponse({ description: 'full' })
  add(@Session() session: UserSession, @Body({ schema: AddTodoBodySchema }) body: z.infer<typeof AddTodoBodySchema>): Promise<Todo> {
    return this.todos.add(session.user.id, body.text);
  }

  /** "Clear done": every ticked item goes. */
  @Delete('done')
  @HttpCode(204)
  @ApiNoContentResponse()
  clearDone(@Session() session: UserSession): Promise<void> {
    return this.todos.clearDone(session.user.id);
  }

  /** Tick or untick. */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: TodoSchema })
  tick(
    @Session() session: UserSession,
    @Param('id', Id) id: string,
    @Body({ schema: TickTodoBodySchema }) body: z.infer<typeof TickTodoBodySchema>,
  ): Promise<Todo> {
    return this.todos.tick(session.user.id, id, body.done);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Session() session: UserSession, @Param('id', Id) id: string): Promise<void> {
    return this.todos.remove(session.user.id, id);
  }
}
