import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Set up multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files
app.use(express.static('public'));

// Template for imsmanifest.xml
const manifestTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-<%= uuid %>" version="1.0" 
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" 
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd 
    http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd 
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="TOC1">
    <organization identifier="TOC1">
      <title><%= title %></title>
      <item identifier="ITEM1" identifierref="RESOURCE1">
        <title><%= title %></title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RESOURCE1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

// Function to create SCORM package
async function createScormPackage(htmlContent, title, outputPath) {
  const uuid = uuidv4();
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve());
    archive.on('error', err => reject(err));

    archive.pipe(output);

    // Add the manifest file
    const manifestContent = manifestTemplate
      .replace('<%= uuid %>', uuid)
      .replace(/<%= title %>/g, title);
    
    archive.append(manifestContent, { name: 'imsmanifest.xml' });

    // Add the HTML content
    archive.append(htmlContent, { name: 'index.html' });

    // Add SCORM API wrapper
    const apiWrapper = `
      var API = null;
      function findAPI(win) {
        if (win.API) return win.API;
        if (win.parent == win) return null;
        return findAPI(win.parent);
      }
      function initAPI() {
        API = findAPI(window);
        if (API) {
          API.LMSInitialize("");
        }
      }
      function terminateAPI() {
        if (API) {
          API.LMSFinish("");
        }
      }
      window.onload = initAPI;
      window.onunload = terminateAPI;
    `;
    archive.append(apiWrapper, { name: 'scorm_api.js' });

    archive.finalize();
  });
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SCORM Packager</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          form { display: flex; flex-direction: column; gap: 15px; }
          input, textarea { padding: 10px; }
          button { padding: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>HTML to SCORM Packager</h1>
        <form action="/convert" method="post" enctype="multipart/form-data">
          <div>
            <label for="title">Course Title:</label>
            <input type="text" id="title" name="title" required>
          </div>
          <div>
            <label for="html">HTML Content:</label>
            <textarea id="html" name="html" rows="10" required></textarea>
          </div>
          <button type="submit">Create SCORM Package</button>
        </form>
      </body>
    </html>
  `);
});

app.post('/convert', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { html, title } = req.body;
    const outputPath = join(__dirname, '../output', `${uuidv4()}.zip`);
    
    // Ensure output directory exists
    fs.mkdirSync(dirname(outputPath), { recursive: true });
    
    await createScormPackage(html, title, outputPath);
    
    res.download(outputPath, 'scorm_package.zip', (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Clean up the file after sending
      fs.unlink(outputPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('Error creating SCORM package:', error);
    res.status(500).send('Error creating SCORM package');
  }
});

// Start server
app.listen(port, () => {
  console.log(`SCORM Packager running at http://localhost:${port}`);
}); 