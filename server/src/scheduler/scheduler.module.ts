import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Task } from '../entities/task.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevicesModule } from '../devices/devices.module';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task, TaskCompletion, User]),
    NotificationsModule,
    DevicesModule,
  ],
  providers: [ReminderService],
})
export class SchedulerModule {}
