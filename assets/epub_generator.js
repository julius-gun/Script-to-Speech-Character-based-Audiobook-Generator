// Contains functions for generating the EPUB file
// Depends on: translations, currentLanguage

function saveEpub() {
    // Reuse makeBook function, but we need to get the translated text
    // For simplicity, let's just grab the content from the output div for now.
    // A more robust solution might involve reconstructing the text from the sentences and translations.
    const translatedBookContent = document.getElementById('output').innerText;
    makeBook(translatedBookContent); // Pass the content to makeBook
  }
  
  async function makeBook(text) {
    const zip = new JSZip();
    const mimetype = "application/epub+zip";

    // Get translated metadata using synchronous fetchTranslation
    const epubTitle = fetchTranslation('epubDefaultTitle', currentLanguage); // REMOVED await
    const epubAuthor = fetchTranslation('epubDefaultAuthor', currentLanguage); // REMOVED await
    const epubFilename = fetchTranslation('epubDefaultFilename', currentLanguage); // REMOVED await

    const meta = `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>${epubTitle}</dc:title>
        <dc:language>${currentLanguage}</dc:language> <!-- Use current UI lang? Or source lang? -->
        <dc:identifier id="bookid">12345</dc:identifier>
        <dc:creator>${epubAuthor}</dc:creator>
    </metadata>
    <manifest>
        <item href="toc.ncx" media-type="application/x-dtbncx+xml" id="ncx"/>
        <item href="chapter1.xhtml" media-type="application/xhtml+xml" id="chapter1"/>
        <item href="chapter2.xhtml" media-type="application/xhtml+xml" id="chapter2"/>
    </manifest>
    <spine toc="ncx">
        <itemref idref="chapter1"/>
    </spine>
    </package>`;
    const toc = `<?xml version="1.0" encoding="UTF-8"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="12345"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle>
        <text>${epubTitle}</text>
    </docTitle>
    </ncx>`;
    const chapter1 = `<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <title>Chapter 1</title> <!-- Keep simple or translate? -->
    </head>
    <body>
        ` + text + `
    </body>
    </html>`;
  
    zip.file("mimetype", mimetype);
    zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`);
    zip.file("content.opf", meta);
    zip.file("toc.ncx", toc);
    zip.file("chapter1.xhtml", chapter1);
  
    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, epubFilename); // Use translated filename
    });
  }