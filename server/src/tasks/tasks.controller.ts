import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: '할 일 등록' })
  @Post()
  create(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.userId, dto);
  }

  @ApiOperation({ summary: '내 할 일 목록 (서브카테고리+메인카테고리 join)' })
  @Get()
  findAll(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.tasksService.findAll(user.userId);
  }

  @ApiOperation({ summary: '할 일 상세' })
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedRequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOneForDisplay(user.userId, id);
  }

  @ApiOperation({ summary: '할 일 수정 (주기/마감 필드가 바뀌면 완료기록 삭제)' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.userId, id, dto);
  }

  @ApiOperation({ summary: '할 일 삭제' })
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedRequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(user.userId, id);
  }

  @ApiOperation({ summary: '완료 이력 조회' })
  @Get(':id/completions')
  getCompletions(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasksService.getCompletions(user.userId, id);
  }

  @ApiOperation({ summary: '현재 주기 완료 처리' })
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthenticatedRequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.complete(user.userId, id);
  }
}
