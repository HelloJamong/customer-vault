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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('고객사')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: '고객사 목록 조회' })
  @ApiQuery({ name: 'contractType', required: false })
  @ApiQuery({ name: 'inspectionCycleType', required: false })
  @ApiQuery({ name: 'engineerId', required: false })
  @ApiQuery({ name: 'salesId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('contractType') contractType?: string,
    @Query('inspectionCycleType') inspectionCycleType?: string,
    @Query('engineerId') engineerId?: string,
    @Query('salesId') salesId?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({
      contractType,
      inspectionCycleType,
      engineerId: engineerId ? parseInt(engineerId) : undefined,
      salesId: salesId ? parseInt(salesId) : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '고객사 상세 조회' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '고객사 생성' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '고객사 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '고객사 삭제' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
