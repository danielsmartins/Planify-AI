import pymupdf
import os

pdf_path = os.path.join(os.path.dirname(__file__), 'relatorio-auditoria-seguranca.pdf')
doc = pymupdf.open(pdf_path)

print(f"Total de páginas geradas: {len(doc)}")

out_dir = os.path.join(os.path.dirname(__file__), 'rendered_pages')
os.makedirs(out_dir, exist_ok=True)

for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=150)
    img_path = os.path.join(out_dir, f'page_{i+1}.png')
    pix.save(img_path)
    print(f"Página {i+1} renderizada em: {img_path}")

doc.close()
