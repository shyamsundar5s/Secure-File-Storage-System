const express = require('express');
const multer = require('multer');
const { create } = require('ipfs-http-client');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// MongoDB setup
mongoose.connect('mongodb://localhost:27017/secure-files', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fileSchema = new mongoose.Schema({
  filename: String,
  cid: String,
  aesKey: String,
  owner: String,
  sharedWith: [String],
});

const File = mongoose.model('File', fileSchema);

// IPFS setup
const ipfs = create('https://ipfs.infura.io:5001');

// AES encryption
function encryptFile(filePath, aesKey) {
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, Buffer.alloc(16, 0));
  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(`${filePath}.enc`);

  input.pipe(cipher).pipe(output);

  return new Promise((resolve, reject) => {
    output.on('finish', () => resolve(`${filePath}.enc`));
    output.on('error', reject);
  });
}

// Routes
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const aesKey = crypto.randomBytes(32); // Generate AES key
    const encryptedFilePath = await encryptFile(req.file.path, aesKey);

    // Upload encrypted file to IPFS
    const fileBuffer = fs.readFileSync(encryptedFilePath);
    const { cid } = await ipfs.add(fileBuffer);

    // Save metadata to MongoDB
    const file = new File({
      filename: req.file.originalname,
      cid: cid.toString(),
      aesKey: aesKey.toString('hex'),
      owner: req.body.owner,
      sharedWith: [],
    });

    await file.save();

    // Clean up local files
    fs.unlinkSync(req.file.path);
    fs.unlinkSync(encryptedFilePath);

    res.status(200).json({ message: 'File uploaded successfully', cid: cid.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

app.get('/download/:cid', async (req, res) => {
  try {
    const file = await File.findOne({ cid: req.params.cid });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const fileBuffer = Buffer.from(await ipfs.cat(req.params.cid));

    const aesKey = Buffer.from(file.aesKey, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, Buffer.alloc(16, 0));

    const decryptedFilePath = path.join(__dirname, 'downloads', file.filename);
    const output = fs.createWriteStream(decryptedFilePath);

    output.write(decipher.update(fileBuffer));
    output.end(decipher.final());

    res.download(decryptedFilePath, file.filename, () => {
      fs.unlinkSync(decryptedFilePath); // Clean up after sending file
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'File download failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
