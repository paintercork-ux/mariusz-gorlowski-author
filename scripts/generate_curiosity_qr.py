from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.graphics.barcode.qr import QrCodeWidget

ROOT = Path(__file__).resolve().parent.parent
for name, url in [("curiosity-qr-gold.png", "https://mariuszgorlowski.com/curiosity/"),
                  ("curiosity-qr-gold-pl.png", "https://mariuszgorlowski.com/pl/curiosity/")]:
    code = QrCodeWidget(url, barLevel="Q")
    code.qr.make()
    modules = code.qr.modules
    border = 4
    scale = 12
    size = (len(modules) + 2 * border) * scale
    foreground = "#73551f"
    image = Image.new("RGB", (size, size), "white")
    drawing = ImageDraw.Draw(image)
    for row, cells in enumerate(modules):
        for column, dark in enumerate(cells):
            if dark:
                x = (column + border) * scale
                y = (row + border) * scale
                drawing.rectangle((x, y, x + scale - 1, y + scale - 1), fill=foreground)
    image.save(ROOT / "assets" / name)
    print("QR target", url, "modules", len(modules), "pixels", size)
