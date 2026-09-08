import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Task } from '../tasks/entities/task.entity';
import { TaskCompletion } from '../tasks/entities/task-completion.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevicesModule } from '../devices/devices.module';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task, TaskCompletion]),
    NotificationsModule,
    DevicesModule,
  ],
  providers: [ReminderService],
})
export class SchedulerModule {}
