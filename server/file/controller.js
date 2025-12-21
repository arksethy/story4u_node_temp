const fs = require('fs');
const path = require('path');
const uploadFile = require("../middleware/upload");
var VerifyToken = require('../auth/VerifyToken');
// Use environment variable for base URL
const baseUrl = process.env.BASE_URL || 'http://localhost:8080/';

const upload = async (req, res) => {
  try {
    await uploadFile(req, res);

    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    res.status(200).send(    
    {
      message: "Uploaded the file successfully: " + req.file.originalname,
      url: baseUrl + "resources/static/assets/uploads/" + req.file.filename,
      filename: req.file.filename
    }
    );
  } catch (err) {
    // Handle multer errors
    if (err.message && err.message.includes('Invalid file')) {
      return res.status(400).send({
        message: err.message
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send({
        message: "File size exceeds the maximum limit of 12MB"
      });
    }
    res.status(500).send({
      message: `Could not upload the file. ${err.message || err}`,
    });
  }
};

const getListFiles = (req, res) => {
  const directoryPath = path.join(__basedir, "resources", "static", "assets", "uploads");

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return res.status(500).send({
        message: "Unable to scan files!",
      });
    }

    let fileInfos = [];

    files.forEach((file) => {
      // Sanitize filename to prevent path traversal
      const sanitized = path.basename(file);
      // Only include files, not directories
      const filePath = path.join(directoryPath, sanitized);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          fileInfos.push({
            name: sanitized,
            url: baseUrl + "resources/static/assets/uploads/" + sanitized,
          });
        }
      } catch (statErr) {
        // Skip files that can't be accessed
      }
    });

    res.status(200).send(fileInfos);
  });
};

const download = (req, res) => {
  // Sanitize filename to prevent path traversal
  const fileName = path.basename(req.params.name);
  const directoryPath = path.join(__basedir, "resources", "static", "assets", "uploads");
  const filePath = path.join(directoryPath, fileName);

  // Verify the file path is within the uploads directory (prevent path traversal)
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directoryPath);
  
  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).send({
      message: "Access denied. Invalid file path."
    });
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send({
        message: "File not found."
      });
    }

    res.download(filePath, fileName, (err) => {
      if (err) {
        res.status(500).send({
          message: "Could not download the file. " + err.message,
        });
      }
    });
  });
};

module.exports = {
  upload,
  getListFiles,
  download,
};