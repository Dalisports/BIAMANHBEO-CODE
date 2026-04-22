import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

writeFileSync('C:/Users/DELL/.ssh/id_ed25519', privateKey);

const spki = publicKey.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').trim();
const buf = Buffer.from(spki, 'base64');

const keyType = Buffer.from([0x00, 0x00, 0x00, 0x0b, 0x73, 0x73, 0x68, 0x2d, 0x65, 0x64, 0x32, 0x35, 0x35, 0x31, 0x39]);
const keyBlob = buf.slice(-32);
const keyData = Buffer.concat([keyType, keyBlob.slice(-32), keyBlob.slice(0, 32)]);
const openssh = 'ssh-ed25519 ' + keyData.toString('base64') + ' github-deploy\n';

writeFileSync('C:/Users/DELL/.ssh/id_ed25519.pub', openssh);
console.log('Generated!');
console.log(openssh);