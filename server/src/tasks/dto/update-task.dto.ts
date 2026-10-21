// @nestjs/mapped-types 대신 @nestjs/swagger의 PartialType을 씀 — 둘 다 class-validator
// 메타데이터(@IsOptional() 자동 적용 등)는 동일하게 가져가지만, mapped-types 쪽은 Swagger
// 메타데이터를 안 들고 와서 /api-docs의 UpdateTaskDto 스키마가 빈 객체로 나오는 문제가 있었음
import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
