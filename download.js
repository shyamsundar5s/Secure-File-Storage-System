const crypto = require('crypto');

app.get('/download/:cid', authenticateJWT, async (req, res) => {
  const file = await File.findOne({ cid: req.params.cid });
  if (!file) return res.status(404).json({ error: 'File not found' });

  // Check if the user has access
  const shared = file.sharedWith.find(s => s.recipient === req.user.username);
  if (!shared && file.owner !== req.user.username) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Decrypt AES key using user's RSA private key
  const privateKey = fs.readFileSync(`keys/${req.user.username}-private.pem`, 'utf8');
  const aesKey = crypto.privateDecrypt(
    privateKey,
    Buffer.from(shared.encryptedKey, 'hex')
  );

  // Decrypt the file (same as earlier)
  const fileBuffer = Buffer.from(await ipfs.cat(req.params.cid));
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, Buffer.alloc(16, 0));
  const decryptedFilePath = path.join(__dirname, 'downloads', file.filename);
  const output = fs.createWriteStream(decryptedFilePath);

  output.write(decipher.update(fileBuffer));
  output.end(decipher.final());

  res.download(decryptedFilePath, file.filename, () => {
    fs.unlinkSync(decryptedFilePath); // Clean up after sending file
  });
});
