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
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('문서')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
  ) {}

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

  @Post('my/upload')
  @Roles(Role.USER)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const customerId = req.body.customerId;
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
  async uploadByUser(
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req,
  ) {
    const customerId = parseInt(body.customerId);
    const userId = req.user.id;

    // 사용자가 해당 고객사를 담당하는지 확인
    const isAssigned = await this.service.isUserAssignedToCustomer(userId, customerId);

    if (!isAssigned) {
      // 업로드된 파일 삭제
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new ForbiddenException('담당하지 않는 고객사에는 점검서를 업로드할 수 없습니다.');
    }

    return this.service.create({
      customerId,
      inspectionTargetId: parseInt(body.inspectionTargetId),
      title: body.title,
      description: body.description,
      filename: file.originalname,
      filepath: file.path,
      fileSize: file.size,
      uploadedBy: userId,
      inspectionDate: body.inspectionDate,
      inspectionType: body.inspectionType,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
