# -*- coding: utf-8 -*-
import os, sys, io, json
import pymupdf

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = os.path.join(BASE, "extract")
IMG = os.path.join(EXT, "img")
os.makedirs(IMG, exist_ok=True)

PDF = r"E:\dsh-workspace\圣杯战争·衡水：凌晨四点的圣杯（COC七版模组）.pdf"
doc = pymupdf.open(PDF)

out = io.StringIO()
out.write("pages: %d\n" % doc.page_count)
for i, page in enumerate(doc):
    txt = page.get_text("text")
    out.write("\n\n========== PAGE %d ==========\n" % (i + 1))
    out.write(txt)
with open(os.path.join(EXT, "module_text.txt"), "w", encoding="utf-8") as f:
    f.write(out.getvalue())

# images
inv = []
seen = set()
for i, page in enumerate(doc):
    for info in page.get_images(full=True):
        xref = info[0]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            pix = pymupdf.Pixmap(doc, xref)
            if pix.n - pix.alpha >= 4:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            name = "p%03d_x%d.png" % (i + 1, xref)
            pix.save(os.path.join(IMG, name))
            inv.append({"page": i + 1, "xref": xref, "file": name, "w": pix.width, "h": pix.height})
            pix = None
        except Exception as e:
            inv.append({"page": i + 1, "xref": xref, "err": str(e)})
with open(os.path.join(EXT, "image_inventory.json"), "w", encoding="utf-8") as f:
    json.dump(inv, f, ensure_ascii=False, indent=1)

# xlsx
import openpyxl
wb = openpyxl.load_workbook(r"C:\Users\青雨\Downloads\COC七版规则空白卡(1).xlsx", data_only=True)
x = io.StringIO()
for ws in wb.worksheets:
    x.write("\n\n===== SHEET: %s (%d x %d) =====\n" % (ws.title, ws.max_row, ws.max_column))
    for row in ws.iter_rows(values_only=True):
        vals = [str(c).strip() for c in row if c not in (None, "")]
        if vals:
            x.write(" | ".join(vals)[:600] + "\n")
with open(os.path.join(EXT, "sheet.txt"), "w", encoding="utf-8") as f:
    f.write(x.getvalue())

print("text chars", len(out.getvalue()))
print("images", len(inv))
