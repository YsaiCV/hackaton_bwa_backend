import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, StandardFonts } from 'pdf-lib';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  async downloadPdf(url: string): Promise<ArrayBuffer> {
    try {
      this.logger.log(`Downloading PDF from ${url}`);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return response.data;
    } catch (e: any) {
      this.logger.error(`Error downloading PDF from ${url}:`, e);
      throw new BadRequestException('No se pudo descargar el documento PDF desde la URL proporcionada.');
    }
  }

  async parsePdfForm(url: string) {
    const pdfBytes = await this.downloadPdf(url);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const parsedFields = fields.map(field => {
      const name = field.getName();
      let type = 'Unknown';
      let options: string[] | undefined = undefined;

      if (field instanceof PDFTextField) type = 'TextField';
      else if (field instanceof PDFCheckBox) type = 'CheckBox';
      else if (field instanceof PDFDropdown) {
        type = 'Dropdown';
        options = field.getOptions();
      } else if (field instanceof PDFOptionList) {
        type = 'OptionList';
        options = field.getOptions();
      } else if (field instanceof PDFRadioGroup) {
        type = 'RadioGroup';
        options = field.getOptions();
      }

      return {
        name,
        type,
        options,
      };
    });

    return {
      url,
      fields: parsedFields,
    };
  }

  async generateTestPdfForm(): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([550, 750]);
    const form = pdfDoc.getForm();

    page.drawText('Formulario de Prueba para Hackathon', { x: 50, y: 700, size: 20 });

    page.drawText('Nombre Completo:', { x: 50, y: 650, size: 12 });
    const nameField = form.createTextField('nombreCompleto');
    nameField.addToPage(page, { x: 200, y: 645, width: 300, height: 25 });

    page.drawText('¿Acepta los términos?:', { x: 50, y: 600, size: 12 });
    const termsField = form.createCheckBox('aceptoTerminos');
    termsField.addToPage(page, { x: 200, y: 595, width: 20, height: 20 });
    
    page.drawText('Tipo de Trámite:', { x: 50, y: 550, size: 12 });
    const tramiteField = form.createDropdown('tipoTramite');
    tramiteField.addOptions(['Renovación Segip', 'Pago de Impuestos', 'Otros']);
    tramiteField.addToPage(page, { x: 200, y: 545, width: 300, height: 25 });

    return await pdfDoc.save();
  }

  async generateCustomLetterPdf(data: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4 estándar
    
    const marginX = 80;
    let currentY = 750;
    const fontSize = 12;

    // Fecha a la derecha
    const header = `${data.ciudad || '_________________'}, ${data.fecha || '___ de ______________ de 20__'}`;
    page.drawText(header, { x: 300, y: currentY, size: fontSize });
    currentY -= 60;

    // Destinatario
    page.drawText(data.destinatarioTitulo || 'Señor(a):', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.destinatarioNombre || '_________________________________________', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.destinatarioCargo || '_________________________________________', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText('Presente.-', { x: marginX, y: currentY, size: fontSize });
    currentY -= 40;

    // Referencia
    const ref = `Ref. ${data.referencia || '_________________________________________'}`;
    page.drawText(ref, { x: marginX + 150, y: currentY, size: fontSize });
    currentY -= 40;

    // Saludo
    page.drawText(data.saludo || 'De mi mayor consideración:', { x: marginX, y: currentY, size: fontSize });
    currentY -= 30;

    // Cuerpo
    const body = data.cuerpo || 'A través de la presente solicito muy respetuosamente se me extienda ____________________________________________________________________________________________________________________________________________________________________________________________________________________________________.';
    
    // pdf-lib soporta maxWidth y wrapping automáticamente
    page.drawText(body, { 
      x: marginX + 20, 
      y: currentY, 
      size: fontSize,
      maxWidth: 420,
      lineHeight: 18
    });
    
    const approxLines = Math.ceil(body.length / 65);
    currentY -= (approxLines * 18) + 30;

    // Despedida
    const despedida = data.despedida || 'Esperando su comprensión a la presente, saludo a Ud. Con toda atención.';
    page.drawText(despedida, { 
      x: marginX + 20, 
      y: currentY, 
      size: fontSize,
      maxWidth: 420,
      lineHeight: 18 
    });
    currentY -= 100;

    // Firma (centrado inferior)
    page.drawText(data.remitenteNombre || 'Firma: ______________________________', { x: marginX + 100, y: currentY, size: fontSize });
    currentY -= 20;
    page.drawText(data.remitenteReg || 'Aclaración de firma: ____________________', { x: marginX + 100, y: currentY, size: fontSize });
    currentY -= 20;
    page.drawText(data.remitenteCI || 'C.I.: _______________________________', { x: marginX + 100, y: currentY, size: fontSize });

    return await pdfDoc.save();
  }

  async generateProcedurePdf(data: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const marginX = 50;
    let currentY = 780;
    const bottomMargin = 50;

    const checkPageBreak = (neededSpace: number) => {
      if (currentY - neededSpace < bottomMargin) {
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = 780;
      }
    };

    // Helper for wrapped text
    const drawWrapped = (text: string, size: number, font: any, x: number, maxWidth: number) => {
      const words = text.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        const width = font.widthOfTextAtSize(testLine, size);
        if (width > maxWidth && line !== '') {
          checkPageBreak(size + 5);
          page.drawText(line, { x, y: currentY, size, font });
          currentY -= (size + 5);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line !== '') {
        checkPageBreak(size + 5);
        page.drawText(line, { x, y: currentY, size, font });
        currentY -= (size + 5);
      }
    };

    // Título
    if (data.title) {
      checkPageBreak(40);
      drawWrapped(data.title.toUpperCase(), 18, fontBold, marginX, 495);
      currentY -= 10;
    }

    if (data.institution) {
      checkPageBreak(20);
      drawWrapped(data.institution, 12, fontBold, marginX, 495);
      currentY -= 15;
    }

    // Datos rápidos
    const quickInfo = [
      `Costo: ${data.cost || 'N/A'}`,
      `Tiempo: ${data.time || 'N/A'}`,
      `Modalidad: ${data.modality || 'N/A'}`,
      `Quién puede realizarlo: ${data.whoCanDoIt || 'N/A'}`
    ];
    
    for (const info of quickInfo) {
      checkPageBreak(15);
      page.drawText(`• ${info}`, { x: marginX, y: currentY, size: 11, font: fontNormal });
      currentY -= 15;
    }
    currentY -= 10;

    // Helper to draw lists
    const drawSection = (title: string, items: any[], isDocument = false) => {
      if (!items || items.length === 0) return;
      checkPageBreak(30);
      page.drawText(title, { x: marginX, y: currentY, size: 14, font: fontBold });
      currentY -= 20;

      items.forEach((item, index) => {
        let text = '';
        if (typeof item === 'string') {
          text = item;
        } else if (item && item.name) {
          text = item.name;
          if (item.requiresRequestLetter) {
            text += ' (Requiere carta de solicitud)';
          }
        }
        
        const prefix = isDocument ? '  - ' : `  ${index + 1}. `;
        drawWrapped(`${prefix}${text}`, 11, fontNormal, marginX, 470);
        currentY -= 5;
      });
      currentY -= 10;
    };

    drawSection('Requisitos / Documentos', data.documents, true);
    drawSection('Pasos a seguir', data.steps, false);
    drawSection('Recomendaciones', data.recommendations, true);
    drawSection('Dónde realizarlo', data.whereToDoIt, true);

    return await pdfDoc.save();
  }

  async fillPdfForm(url: string, data: Record<string, any>): Promise<Uint8Array> {
    const pdfBytes = await this.downloadPdf(url);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    for (const [key, value] of Object.entries(data)) {
      try {
        const field = form.getField(key);
        if (!field) continue;

        if (field instanceof PDFTextField) {
          field.setText(String(value));
        } else if (field instanceof PDFCheckBox) {
          if (value === true || value === 'true' || value === 'on') {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
          field.select(String(value));
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(value));
        }
      } catch (e: any) {
        this.logger.warn(`Could not set field ${key}: ${e.message}`);
      }
    }

    // Aplanar el formulario para que los campos queden integrados como texto estático y no editables
    form.flatten();

    return await pdfDoc.save();
  }
}
