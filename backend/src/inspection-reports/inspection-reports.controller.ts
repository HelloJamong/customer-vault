import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  Req,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { InspectionReportsService } from './inspection-reports.service';
import { CreateInspectionReportDto } from './dto/create-inspection-report.dto';
import { UpdateInspectionReportDto } from './dto/update-inspection-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Inspection Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection-reports')
export class InspectionReportsController {
  constructor(
    private readonly inspectionReportsService: InspectionReportsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '점검서 생성' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '점검서가 성공적으로 생성되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청입니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '고객사를 찾을 수 없습니다.',
  })
  create(@Body() createDto: CreateInspectionReportDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.inspectionReportsService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: '점검서 목록 조회' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: '고객사 ID로 필터링',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '점검서 목록을 성공적으로 조회했습니다.',
  })
  findAll(@Query('customerId') customerId?: string) {
    const customerIdNum = customerId ? parseInt(customerId, 10) : undefined;
    return this.inspectionReportsService.findAll(customerIdNum);
  }

  @Get(':id')
  @ApiOperation({ summary: '점검서 상세 조회' })
  @ApiParam({ name: 'id', description: '점검서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '점검서를 성공적으로 조회했습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '점검서를 찾을 수 없습니다.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inspectionReportsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '점검서 수정' })
  @ApiParam({ name: 'id', description: '점검서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '점검서가 성공적으로 수정되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '점검서를 찾을 수 없습니다.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInspectionReportDto,
  ) {
    return this.inspectionReportsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '점검서 삭제' })
  @ApiParam({ name: 'id', description: '점검서 ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '점검서가 성공적으로 삭제되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '점검서를 찾을 수 없습니다.',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.inspectionReportsService.remove(id);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get(':id/download')
  @ApiOperation({ summary: '점검서 Word 파일 다운로드' })
  @ApiParam({ name: 'id', description: '점검서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Word 파일이 성공적으로 생성되었습니다.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '점검서 또는 템플릿을 찾을 수 없습니다.',
  })
  async downloadWord(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.inspectionReportsService.generateWordDocument(id);
    const report = await this.inspectionReportsService.findOne(id);

    const filename = `점검서_${report.customerName}_${report.inspectionYear}년${report.inspectionMonth}월.docx`;
    const encodedFilename = encodeURIComponent(filename);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    res.send(buffer);
  }
}
