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
import { MainCategoriesService } from './main-categories.service';
import { CreateMainCategoryDto } from './dto/create-main-category.dto';
import { UpdateMainCategoryDto } from './dto/update-main-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedRequestUser } from '../auth/jwt-auth.guard';

@ApiTags('main-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('main-categories')
export class MainCategoriesController {
  constructor(private readonly mainCategoriesService: MainCategoriesService) {}

  @ApiOperation({ summary: '메인 카테고리 등록' })
  @Post()
  create(@CurrentUser() user: AuthenticatedRequestUser, @Body() dto: CreateMainCategoryDto) {
    return this.mainCategoriesService.create(user.userId, dto);
  }

  @ApiOperation({ summary: '내 메인 카테고리 목록' })
  @Get()
  findAll(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.mainCategoriesService.findAll(user.userId);
  }

  @ApiOperation({ summary: '메인 카테고리 수정' })
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMainCategoryDto,
  ) {
    return this.mainCategoriesService.update(user.userId, id, dto);
  }

  @ApiOperation({ summary: '메인 카테고리 삭제' })
  @ApiQuery({
    name: 'deleteSubItems',
    required: false,
    type: Boolean,
    description: 'true면 하위 서브카테고리+할 일까지 같이 삭제, false(기본값)면 null로만 분리',
  })
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id', ParseIntPipe) id: number,
    // ?deleteSubItems=true 로 하위 서브카테고리+task까지 같이 삭제, 기본값(false)은 null로만 변경
    @Query('deleteSubItems', new DefaultValuePipe(false), ParseBoolPipe) deleteSubItems: boolean,
  ) {
    return this.mainCategoriesService.remove(user.userId, id, deleteSubItems);
  }
}
