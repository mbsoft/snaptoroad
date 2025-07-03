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

        // Assign folder ID if provided
        if (folderId) {
            fileMetadata.parents = [folderId];
        }

        const media = {
            mimeType: 'application/json',  // Adjust mime type based on your file
            body: fs.createReadStream(filePath),
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, parents',
        });

        console.log(`File uploaded successfully, File ID: ${response.data.id}`);
        console.log(`File uploaded to folder ID: ${response.data.parents}`);
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
    }
}

// Process command-line arguments
const filePath = process.argv[2];
const folderId = process.argv[3];
if (!filePath) {
    console.error('Please provide the path to the file to upload.');
    process.exit(1);
}

uploadFileToDrive(filePath, folderId);