#!/usr/bin/env python3
"""Sign a Mayham NSIS installer for the built-in update checker.

Requires `pip install cryptography`. Run `keygen` once OFFLINE and never commit
or distribute the PEM private key. Put the public X||Y key into the Windows
build environment as MAYHAM_UPDATE_PUBLIC_KEY and specify MAYHAM_UPDATE_REPO.
"""
import argparse, base64
from pathlib import Path
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption, load_pem_private_key

def main():
    ap=argparse.ArgumentParser()
    sub=ap.add_subparsers(dest='cmd',required=True)
    gen=sub.add_parser('keygen');gen.add_argument('--out',default='mayham-update-private.pem')
    sign=sub.add_parser('sign');sign.add_argument('installer');sign.add_argument('--private-key',required=True)
    args=ap.parse_args()
    if args.cmd=='keygen':
        path=Path(args.out)
        if path.exists():ap.error('Refusing to overwrite an existing private key')
        key=ec.generate_private_key(ec.SECP256R1())
        path.write_bytes(key.private_bytes(Encoding.PEM,PrivateFormat.PKCS8,NoEncryption()))
        pub=key.public_key().public_numbers()
        print('PRIVATE KEY (keep secret):',path.resolve())
        print('MAYHAM_UPDATE_PUBLIC_KEY=',f'{pub.x:064x}{pub.y:064x}',sep='')
    else:
        path=Path(args.installer)
        if not path.name.startswith('Mayham-Accounts-Setup-') or not path.name.endswith('.exe'):
            ap.error('Installer name must be Mayham-Accounts-Setup-X.Y.Z.exe')
        key=load_pem_private_key(Path(args.private_key).read_bytes(),password=None)
        if not isinstance(key,ec.EllipticCurvePrivateKey) or not isinstance(key.curve,ec.SECP256R1):ap.error('Expected P-256 private key')
        payload=(path.name+'\n').encode()+path.read_bytes()
        der=key.sign(payload,ec.ECDSA(hashes.SHA256()))
        r,ss=utils.decode_dss_signature(der)
        raw=r.to_bytes(32,'big')+ss.to_bytes(32,'big')
        sig=path.with_name(path.name+'.sig')
        sig.write_bytes(base64.b64encode(raw)+b'\n')
        print('Signed',path.name,'->',sig.name)
if __name__=='__main__':main()
