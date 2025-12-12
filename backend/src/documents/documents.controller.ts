import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseIntPipe,
  Res,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('문서')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('inspectionTargetId') inspectionTargetId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findByCustomer(customerId, {
      inspectionTargetId: inspectionTargetId ? parseInt(inspectionTargetId) : undefined,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const document = await this.service.findOne(id);

    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    const filepath = this.service.getFilePath(document);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    res.download(filepath, document.filename);
  }

  @Post('customer/:customerId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const customerId = req.params.customerId;
          const dir = path.join(uploadDir, String(year), month, `customer_${customerId}`);

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '16777216'),
      },
    }),
  )
  async upload(
    @Param('customerId', ParseIntPipe) customerId: number,
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req,
  ) {
    return this.service.create({
      customerId,
      inspectionTargetId: parseInt(body.inspectionTargetId),
      title: body.title,
      description: body.description,
      filename: file.originalname,
      filepath: file.path,
      fileSize: file.size,
      uploadedBy: req.user.id,
      inspectionDate: body.inspectionDate,
      inspectionType: body.inspectionType,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
