import('crypto').then(crypto => {
  const { generateKeyPairSync } = crypto;
  try {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    const fs = require('fs');
    fs.writeFileSync('C:/Users/DELL/.ssh/id_ed25519', privateKey);
    
    const spki = publicKey.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').trim();
    const buf = Buffer.from(spki, 'base64');
    
    // Build OpenSSH format: ssh-ed25519 <keybytes> <comment>
    const keyType = Buffer.from([0x00, 0x00, 0x00, 0x0b, 0x73, 0x73, 0x68, 0x2d, 0x65, 0x64, 0x32, 0x35, 0x35, 0x31, 0x39]);
    // Use first 32 bytes as the key (ed25519 public key is 32 bytes)
    const keyBlob = buf.slice(-32);
    const keyData = Buffer.concat([keyType, keyBlob.slice(-32), keyBlob.slice(0, 32)]);
    const openssh = 'ssh-ed25519 ' + keyData.toString('base64') + ' github-deploy\n';
    
    fs.writeFileSync('C:/Users/DELL/.ssh/id_ed25519.pub', openssh);
    console.log('Generated!');
    console.log(openssh);
  } catch(e) {
    console.error(e.message);
  }
});