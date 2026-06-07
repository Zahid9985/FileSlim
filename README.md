# FileSlim – Smart File Resizer

A 100% browser-based tool to resize Images and PDFs to any target file size.
No server, no upload, fully private.

## live 
https://file-slim.vercel.app/

## 📁 Project Structure

```
FileResizer/
├── index.html          ← Main HTML page
├── css/
│   └── style.css       ← All styles (dark glass-morphism design)
├── js/
│   └── app.js          ← All JavaScript logic
└── README.md
```

## 🚀 How to Use

Just open `index.html` in any modern browser (Chrome, Edge, Firefox).
No installation, no server needed.

## 🔧 Key APIs Used

| API | Purpose |
|-----|---------|
| Drag & Drop Events | `dragover`, `drop` on the drop zone |
| FileReader API | Reads file into memory |
| Canvas API | Draws & compresses images |
| `canvas.toBlob(quality)` | Controls JPEG compression quality |
| Binary Search | Finds optimal quality to hit target size |
| PDF.js | Renders PDF pages to canvas |
| jsPDF | Packs canvas frames back into PDF |
| `URL.createObjectURL()` | Creates download link from Blob |

## ⚠️ Limitations

- Very small target sizes (e.g. <10 KB for a photo) may not be achievable
  without severe quality loss
- PDF resize works by re-rendering to images, so text becomes rasterized
- Works best in Chrome/Edge for PDF processing

## 🔒 Privacy

Everything runs inside your browser tab.
No file ever leaves your device.
