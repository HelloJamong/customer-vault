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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadTemplate(
    @Body('inspectionTargetId') inspectionTargetId: string,
    @Body('customerName') customerName: string,
    @Body('productName') productName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('파일을 선택해주세요.');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/haansofthwp',
      'application/x-hwp',
      'application/vnd.hancom.hwp',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('허용되지 않은 파일 형식입니다.');
    }

    return this.service.uploadTemplate(
      parseInt(inspectionTargetId),
      file,
      customerName,
      productName,
    );
  }
}
