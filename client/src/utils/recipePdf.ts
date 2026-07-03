import jsPDF from 'jspdf';
import type { Recipe } from '../types';

export function downloadRecipePDF(recipe: Recipe) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 8, 6);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('12%', 10, 17);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CAFÉ DE ESPECIALIDAD', 10, 24);

  doc.setTextColor(13, 8, 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(recipe.title, 10, 42);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 60);
  let metaY = 50;
  if (recipe.temp) {
    doc.text(`Temperatura: ${recipe.temp}`, 10, metaY);
    metaY += 6;
  }
  if (recipe.grind) {
    doc.text(`Molienda: ${recipe.grind}`, 10, metaY);
    metaY += 6;
  }
  if (recipe.ratio) {
    doc.text(`Ratio: ${recipe.ratio}`, 10, metaY);
    metaY += 6;
  }
  if (recipe.prepTime) {
    doc.text(`Tiempo: ${recipe.prepTime} min`, 10, metaY);
    metaY += 6;
  }

  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.3);
  doc.line(10, metaY + 2, W - 10, metaY + 2);
  metaY += 8;

  doc.setTextColor(13, 8, 6);
  recipe.steps.forEach((step, i) => {
    if (metaY > 185) {
      doc.addPage();
      metaY = 15;
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${step.title}`, 10, metaY);
    metaY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(step.description, W - 20);
    doc.text(lines, 10, metaY);
    metaY += lines.length * 4.5 + 4;
  });

  doc.setFontSize(7);
  doc.setTextColor(150, 120, 90);
  doc.text('12porciento.cafe', 10, doc.internal.pageSize.getHeight() - 8);

  doc.save(`${recipe.slug}.pdf`);
}
