import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { InspectionTargetsService, CreateInspectionTargetDto, UpdateInspectionTargetDto } from './inspection-targets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { getClientIp } from '../common/utils/ip.util';

@ApiTags('점검 대상')
@Controller('inspection-targets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InspectionTargetsController {
  constructor(private readonly service: InspectionTargetsService) {}

  @Get('customer/:customerId')
  findByCustomer(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.service.findByCustomer(customerId);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  async create(@Body() dto: CreateInspectionTargetDto, @Req() req: any) {
    return this.service.create(dto, { userId: req.user.id, ipAddress: getClientIp(req) });
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInspectionTargetDto, @Req() req: any) {
    return this.service.update(id, dto, { userId: req.user.id, ipAddress: getClientIp(req) });
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, { userId: req.user.id, ipAddress: getClientIp(req) });
  }

  @Get(':id/template')
  checkTemplateExists(@Param('id', ParseIntPipe) id: number) {
    return this.service.checkTemplateExists(id);
  }

  @Get(':id/template/download')
  async downloadTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, filename, mimetype } = await this.service.downloadTemplate(id);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    return new StreamableFile(file);
  }

  @Post('template/upload')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '16777216') },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async uploadTemplate(
    @Body('inspectionTargetId') inspectionTargetId: string,
    @Body('customerName') customerName: string,
    @Body('productName') productName: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('파일을 선택해주세요.');
    }

    await this.service.assertCanManageTarget(parseInt(inspectionTargetId), req.user);

    return this.service.uploadTemplate(
      parseInt(inspectionTargetId),
      file,
      customerName,
      productName,
      { userId: req.user?.id, ipAddress: req.ip },
    );
  }
}
