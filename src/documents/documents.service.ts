import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup } from 'pdf-lib';

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
    const header = `${data.ciudad || 'El Alto'} ${data.fecha || '10 de Diciembre del 2014'}.`;
    page.drawText(header, { x: 300, y: currentY, size: fontSize });
    currentY -= 60;

    // Destinatario
    page.drawText(data.destinatarioTitulo || 'Señor', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.destinatarioNombre || 'Dr. Iván Molina Gutierrez', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.destinatarioCargo || 'Director de la carrera de Derecho U.P.E.A.', { x: marginX, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText('Presente.-', { x: marginX, y: currentY, size: fontSize });
    currentY -= 40;

    // Referencia
    const ref = `Ref. ${data.referencia || 'SOLICITUD DE HISTORIAL ACADEMICO'}`;
    page.drawText(ref, { x: marginX + 150, y: currentY, size: fontSize });
    currentY -= 40;

    // Saludo
    page.drawText(data.saludo || 'Señor Director:', { x: marginX, y: currentY, size: fontSize });
    currentY -= 30;

    // Cuerpo
    const body = data.cuerpo || 'A tiempo de saludar y felicitar a su persona, por la excelente labor al frente de la dirección de carrera de derecho de la UPEA, solicito, me extienda una cpioa de mi historial de calificaciones, vía kardex con la finalidad de conocer mis materias aprobadas.';
    
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
    currentY -= 80;

    // Firma (centrado inferior)
    page.drawText(data.remitenteNombre || 'Univ. CRUZ GUTIERREZ JOSE LUIS', { x: marginX + 100, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.remitenteReg || 'Reg. Univ. 9003029', { x: marginX + 100, y: currentY, size: fontSize });
    currentY -= 15;
    page.drawText(data.remitenteCI || 'CI 6922963 L.P.', { x: marginX + 100, y: currentY, size: fontSize });

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
