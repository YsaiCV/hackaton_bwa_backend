import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, IsObject, IsOptional, IsString } from 'class-validator';

export class ParseDocumentDto {
  @ApiProperty({ description: 'URL del documento PDF a parsear', example: 'https://example.com/form.pdf' })
  @IsUrl()
  url: string;
}

export class FillDocumentDto {
  @ApiProperty({ description: 'URL del documento PDF a rellenar', example: 'https://example.com/form.pdf' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Datos del formulario a rellenar (llave: valor)' })
  @IsObject()
  data: Record<string, any>;
}

export class GenerateLetterDto {
  @ApiProperty() @IsOptional() @IsString() ciudad?: string;
  @ApiProperty() @IsOptional() @IsString() fecha?: string;
  @ApiProperty() @IsOptional() @IsString() destinatarioTitulo?: string;
  @ApiProperty() @IsOptional() @IsString() destinatarioNombre?: string;
  @ApiProperty() @IsOptional() @IsString() destinatarioCargo?: string;
  @ApiProperty() @IsOptional() @IsString() referencia?: string;
  @ApiProperty() @IsOptional() @IsString() saludo?: string;
  @ApiProperty() @IsOptional() @IsString() cuerpo?: string;
  @ApiProperty() @IsOptional() @IsString() despedida?: string;
  @ApiProperty() @IsOptional() @IsString() remitenteNombre?: string;
  @ApiProperty() @IsOptional() @IsString() remitenteReg?: string;
  @ApiProperty() @IsOptional() @IsString() remitenteCI?: string;
}
