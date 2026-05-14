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
import { promises as fsp } from 'fs';

@ApiTags('문서')
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
  ) {}

  // 구체적인 경로를 먼저 정의 (라우트 매칭 순서 중요!)
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

          // customerId는 아직 파싱되지 않았을 수 있으므로 임시 디렉토리 사용
          const dir = path.join(uploadDir, String(year), month, 'temp');

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          cb(null, dir);
        },
        filename: (req, file, cb) => {
          // PDF 확장자 검증
          const ext = path.extname(file.originalname).toLowerCase();
          if (ext !== '.pdf') {
            return cb(new Error('PDF 파일만 업로드 가능합니다.'), null);
          }

          // 파일명은 서비스에서 생성하므로 임시로 저장
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `temp_${uniqueSuffix}.pdf`);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '16777216'),
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
          return cb(new Error('PDF 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadByUser(
    @UploadedFile() file: any,
    @Body() body: any,
    @Request() req,
  ) {
    if (!file) {
      throw new Error('파일이 업로드되지 않았습니다.');
    }

    const customerId = parseInt(body.customerId);
    const userId = req.user.id;

    // 사용자가 해당 고객사를 담당하는지 확인
    const isAssigned = await this.service.isUserAssignedToCustomer(userId, customerId);

    if (!isAssigned) {
      await fsp.unlink(file.path).catch(() => {});
      throw new ForbiddenException('담당하지 않는 고객사에는 점검서를 업로드할 수 없습니다.');
    }

    return this.service.create({
      customerId,
      inspectionTargetId: parseInt(body.inspectionTargetId),
      originalFilename: file.originalname,
      tempFilepath: file.path,
      fileSize: file.size,
      uploadedBy: userId,
      inspectionDate: body.inspectionDate,
      inspectionType: body.inspectionType,
    });
  }

  @Get('customer/:customerId')
  findByCustomer(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('inspectionTargetId') inspectionTargetId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findByCustomer(customerId, {
      inspectionTargetId: inspectionTargetId ? parseInt(inspectionTargetId) : undefined,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Request() req) {
    const document = await this.service.findOne(id);

    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    const userRole = req.user.role;
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      const isAssigned = await this.service.isUserAssignedToCustomer(req.user.id, document.customerId);
      if (!isAssigned) {
        throw new ForbiddenException('담당하지 않는 고객사의 문서에 접근할 수 없습니다.');
      }
    }

    const filepath = this.service.getFilePath(document);
    const fileAccessible = await fsp.access(filepath).then(() => true).catch(() => false);

    if (!fileAccessible) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    res.download(filepath, document.filename);
  }

  @Get(':id/view')
  async view(@Param('id', ParseIntPipe) id: number, @Res() res: Response, @Request() req) {
    const document = await this.service.findOne(id);

    if (!document) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    const userRole = req.user.role;
    if (userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
      const isAssigned = await this.service.isUserAssignedToCustomer(req.user.id, document.customerId);
      if (!isAssigned) {
        throw new ForbiddenException('담당하지 않는 고객사의 문서에 접근할 수 없습니다.');
      }
    }

    const filepath = this.service.getFilePath(document);
    const fileAccessible = await fsp.access(filepath).then(() => true).catch(() => false);

    if (!fileAccessible) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    // PDF 파일을 브라우저에서 직접 볼 수 있도록 inline으로 전송
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.filename)}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
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
          const dir = path.join(uploadDir, `customer_${customerId}`, String(year), month);

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          cb(null, dir);
        },
        filename: (req, file, cb) => {
          // PDF 확장자 검증
          const ext = path.extname(file.originalname).toLowerCase();
          if (ext !== '.pdf') {
            return cb(new Error('PDF 파일만 업로드 가능합니다.'), null);
          }

          // 파일명은 서비스에서 생성하므로 임시로 저장
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `temp_${uniqueSuffix}.pdf`);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '16777216'),
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
          return cb(new Error('PDF 파일만 업로드 가능합니다.'), false);
        }
        cb(null, true);
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
      originalFilename: file.originalname,
      tempFilepath: file.path,
      fileSize: file.size,
      uploadedBy: req.user.id,
      inspectionDate: body.inspectionDate,
      inspectionType: body.inspectionType,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user?.id);
  }
}
