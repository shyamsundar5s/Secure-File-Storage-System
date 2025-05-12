const crypto = require('crypto');

// Add recipient to shared list
app.post('/share', authenticateJWT, async (req, res) => {
  const { cid, recipientPublicKey } = req.body;

  const file = await File.findOne({ cid, owner: req.user.username });
  if (!file) return res.status(403).json({ error: 'File not found or permission denied' });

  // Encrypt AES key with recipient's public RSA key
  const recipientKey = crypto.publicEncrypt(
    recipientPublicKey,
    Buffer.from(file.aesKey, 'hex')
  );

  file.sharedWith.push({ recipient: req.body.recipient, encryptedKey: recipientKey.toString('hex') });
  await file.save();

  res.json({ message: 'File shared successfully' });
});
