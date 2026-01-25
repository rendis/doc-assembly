package pdfrenderer

// DefaultStyles returns the default CSS styles for document rendering.
func DefaultStyles() string {
	return `
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    /* Document container */
    .document {
      background: white;
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.3;
    }

    h1 { font-size: 24pt; }
    h2 { font-size: 20pt; }
    h3 { font-size: 16pt; }
    h4 { font-size: 14pt; }
    h5 { font-size: 12pt; }
    h6 { font-size: 11pt; }

    p {
      margin-bottom: 0.75em;
    }

    /* Empty paragraph fallback - ensures spacing even if &nbsp; is missing */
    p:empty {
      min-height: 1em;
      display: block;
    }

    /* Block elements */
    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid #ccc;
      background: #f9f9f9;
      font-style: italic;
    }

    pre {
      margin: 1em 0;
      padding: 1em;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10pt;
    }

    code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      background: #f5f5f5;
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }

    pre code {
      background: none;
      padding: 0;
    }

    hr {
      margin: 1.5em 0;
      border: none;
      border-top: 1px solid #ddd;
    }

    /* Lists */
    ul, ol {
      margin: 0.75em 0;
      padding-left: 2em;
    }

    li {
      margin-bottom: 0.25em;
    }

    ul.task-list {
      list-style: none;
      padding-left: 1.5em;
    }

    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5em;
    }

    .task-item input[type="checkbox"] {
      margin-top: 0.3em;
    }

    /* Links */
    a {
      color: #0066cc;
      text-decoration: underline;
    }

    /* Text formatting */
    strong {
      font-weight: 600;
    }

    em {
      font-style: italic;
    }

    s {
      text-decoration: line-through;
    }

    u {
      text-decoration: underline;
    }

    mark {
      padding: 0.1em 0.2em;
      border-radius: 2px;
    }

    /* Injectables (variables) */
    .injectable {
      display: inline;
    }

    .injectable-empty {
      color: #888;
      font-style: italic;
    }

    /* Tables */
    .document-table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      font-size: 10pt;
    }

    .document-table th,
    .document-table td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }

    .document-table th {
      background-color: #f5f5f5;
      font-weight: 600;
    }

    .document-table tr:nth-child(even) {
      background-color: #fafafa;
    }

    .document-table tr:hover {
      background-color: #f0f0f0;
    }

    .table-placeholder {
      padding: 1em;
      background: #fff3cd;
      border: 1px dashed #ffc107;
      color: #856404;
      text-align: center;
      font-style: italic;
      margin: 1em 0;
    }

    /* Images */
    .document-image {
      margin: 1em 0;
    }

    .document-image.display-block {
      display: block;
    }

    .document-image.display-inline {
      display: inline-block;
    }

    .document-image.align-left {
      text-align: left;
    }

    .document-image.align-center {
      text-align: center;
    }

    .document-image.align-right {
      text-align: right;
    }

    .document-image img {
      max-width: 100%;
      height: auto;
    }

    /* Page break */
    .page-break {
      page-break-after: always;
      break-after: page;
      height: 0;
      margin: 0;
      border: none;
    }

    /* Signature block */
    .signature-block {
      margin: 2em 0;
      page-break-inside: avoid;
    }

    .signature-container {
      display: flex;
      flex-wrap: wrap;
      gap: 2em;
    }

    /* Signature layouts */
    .signature-container.layout-single-left {
      justify-content: flex-start;
    }

    .signature-container.layout-single-center {
      justify-content: center;
    }

    .signature-container.layout-single-right {
      justify-content: flex-end;
    }

    .signature-container.layout-dual-sides {
      justify-content: space-between;
    }

    .signature-container.layout-dual-center {
      flex-direction: column;
      align-items: center;
    }

    .signature-container.layout-dual-left {
      flex-direction: column;
      align-items: flex-start;
    }

    .signature-container.layout-dual-right {
      flex-direction: column;
      align-items: flex-end;
    }

    .signature-container.layout-triple-row {
      justify-content: space-between;
    }

    .signature-container.layout-triple-pyramid {
      justify-content: center;
    }

    .signature-container.layout-triple-inverted {
      justify-content: center;
    }

    .signature-container.layout-quad-grid {
      justify-content: space-between;
    }

    .signature-item {
      text-align: center;
      min-width: 150px;
    }

    .signature-line {
      border-bottom: 1px solid #333;
      margin-bottom: 0.5em;
      min-height: 40px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      position: relative;
    }

    /* Wrapper para centrar la imagen sin interferir con transforms del usuario */
    .signature-image-wrapper {
      position: absolute;
      bottom: 4px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      pointer-events: none;
    }

    .signature-image {
      max-height: 50px;
      max-width: 100%;
      object-fit: contain;
    }

    .signature-line.line-sm {
      width: 96px;
    }

    .signature-line.line-md {
      width: 176px;
    }

    .signature-line.line-lg {
      width: 288px;
    }

    .anchor-string {
      font-size: 6pt;
      color: #ccc;
      margin-bottom: 2px;
    }

    .signature-label {
      font-size: 10pt;
      font-weight: 500;
    }

    .signature-subtitle {
      font-size: 9pt;
      color: #666;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
      }

      .document {
        box-shadow: none;
      }

      .page-break {
        page-break-after: always;
        break-after: page;
      }

      .signature-block {
        page-break-inside: avoid;
      }

      /* Hide anchor strings in print (they're for processing) */
      /* Commented out so signing platforms can detect them */
      /* .anchor-string { display: none; } */
    }

    /* Counter for page numbers (limited support in PDF) */
    @page {
      @bottom-center {
        content: counter(page);
      }
    }
`
}
