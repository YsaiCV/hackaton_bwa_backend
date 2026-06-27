import { Controller, Post, Get, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { type Response } from 'express';
import { DocumentsService } from './documents.service';
import { ParseDocumentDto, FillDocumentDto, GenerateLetterDto, GenerateProcedurePdfDto } from './dto/documents.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parsear un formulario PDF y devolver su estructura de campos' })
  async parsePdf(@Body() dto: ParseDocumentDto) {
    return this.documentsService.parsePdfForm(dto.url);
  }

  @Post('fill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rellenar un formulario PDF con datos y devolver el PDF resultante' })
  async fillPdf(@Body() dto: FillDocumentDto, @Res() res: Response) {
    const pdfBytes = await this.documentsService.fillPdfForm(dto.url, dto.data);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="filled-document.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    
    res.send(Buffer.from(pdfBytes));
  }
  @Get('test-form')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un formulario PDF de prueba con campos AcroForm' })
  async getTestPdf(@Res() res: Response) {
    const pdfBytes = await this.documentsService.generateTestPdfForm();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="test-form.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    
    res.send(Buffer.from(pdfBytes));
  }
  @Post('generate-letter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar una carta de solicitud en formato PDF a partir de datos JSON' })
  async generateLetter(@Body() dto: GenerateLetterDto, @Res() res: Response) {
    const pdfBytes = await this.documentsService.generateCustomLetterPdf(dto);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="carta-solicitud.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    
    res.send(Buffer.from(pdfBytes));
  }
  @Post('generate-procedure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar un PDF con los detalles completos del trámite' })
  async generateProcedure(@Body() dto: GenerateProcedurePdfDto, @Res() res: Response) {
    const pdfBytes = await this.documentsService.generateProcedurePdf(dto);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="detalle-tramite.pdf"');
    res.setHeader('Content-Length', pdfBytes.length);
    
    res.send(Buffer.from(pdfBytes));
  }
}
