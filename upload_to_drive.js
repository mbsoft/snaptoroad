const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

async function uploadFileToDrive(filePath, folderId = null) {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

        // Create OAuth2 client
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: path.basename(filePath),
        };

        if (folderId) {
            fileMetadata.parents = [folderId];
        }

        const media = {
            mimeType: 'text/plain',  // Adjust MIME type according to your file
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`File uploaded successfully, File ID: ${response.data.id}`);
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
    }
}

// Process command-line arguments
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide the path to the file to upload.');
    process.exit(1);
}

uploadFileToDrive(filePath);