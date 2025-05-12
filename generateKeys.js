const crypto = require('crypto');
const fs = require('fs');

function generateKeys(username) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  fs.writeFileSync(`keys/${username}-public.pem`, publicKey.export({ type: 'pkcs1', format: 'pem' }));
  fs.writeFileSync(`keys/${username}-private.pem`, privateKey.export({ type: 'pkcs1', format: 'pem' }));
}

generateKeys('user1');
generateKeys('user2');
