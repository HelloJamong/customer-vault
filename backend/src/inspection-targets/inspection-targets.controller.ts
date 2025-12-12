import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InspectionTargetsService, CreateInspectionTargetDto, UpdateInspectionTargetDto } from './inspection-targets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('점검 대상')
@Controller('inspection-targets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InspectionTargetsController {
  constructor(private readonly service: InspectionTargetsService) {}

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.service.findByCustomer(customerId);
  }

  @Post()
  create(@Body() dto: CreateInspectionTargetDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInspectionTargetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
