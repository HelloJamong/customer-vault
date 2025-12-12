import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('사용자')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '사용자 목록 조회' })
  @ApiQuery({ name: 'role', required: false, description: '역할 필터' })
  @ApiQuery({ name: 'isActive', required: false, description: '활성화 상태' })
  @ApiQuery({ name: 'department', required: false, description: '부서 필터' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  findAll(
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('department') department?: string,
  ) {
    return this.usersService.findAll(
      role,
      isActive ? isActive === 'true' : undefined,
      department,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '사용자 상세 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '사용자 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '사용자 활성화/비활성화 토글' })
  @ApiResponse({ status: 200, description: '변경 성공' })
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id);
  }

  @Post(':id/reset-password')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: '비밀번호 초기화' })
  @ApiResponse({ status: 200, description: '초기화 성공' })
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.resetPassword(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '사용자 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
