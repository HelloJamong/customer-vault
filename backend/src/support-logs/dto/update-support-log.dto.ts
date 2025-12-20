import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportLogDto } from './create-support-log.dto';

export class UpdateSupportLogDto extends PartialType(CreateSupportLogDto) {}
