import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubCategoriesService } from './sub-categories.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@ApiTags('sub-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sub-categories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @ApiOperation({ summary: '서브 카테고리 등록 (mainCategoryId?)' })
  @Post()
  create(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateSubCategoryDto) {
    return this.subCategoriesService.create(user.userId, dto);
  }

  @ApiOperation({ summary: '내 서브 카테고리 목록' })
  @Get()
  findAll(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.subCategoriesService.findAll(user.userId);
  }

  @ApiOperation({ summary: '서브 카테고리 수정' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.subCategoriesService.update(user.userId, id, dto);
  }

  @ApiOperation({ summary: '서브 카테고리 삭제' })
  @ApiQuery({
    name: 'deleteSubItems',
    required: false,
    type: Boolean,
    description: 'true면 이 서브카테고리를 쓰는 할 일까지 같이 삭제, false(기본값)면 null로만 분리',
  })
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
    // ?deleteSubItems=true 로 이 서브카테고리를 쓰는 task까지 같이 삭제, 기본값(false)은 null로만 변경
    @Query('deleteSubItems', new DefaultValuePipe(false), ParseBoolPipe) deleteSubItems: boolean,
  ) {
    return this.subCategoriesService.remove(user.userId, id, deleteSubItems);
  }
}
