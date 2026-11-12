#!/usr/bin/env python3
"""Local-only one-time Mayham updater setup. Never uploads or prints private key."""
import json, os, pathlib, re, sys
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption

base = pathlib.Path(os.environ['LOCALAPPDATA']) / 'MayhamUpdateKeys'
base.mkdir(parents=True, exist_ok=True)
config_file = base / 'config.json'
key_path = base / 'mayham-update-private.pem'
if config_file.exists():
    conf = json.loads(config_file.read_text(encoding='utf-8'))
else:
    print('\nMayham Accounts v0.2.0 signed updater setup (one time)')
    print('Create a PUBLIC GitHub repository for Mayham Accounts releases first.')
    print('This must be separate from your Macro-Mayham-Macros catalog repository.')
    repo = os.environ.get('MAYHAM_INITIAL_UPDATE_REPO', '').strip() or input('GitHub releases repository (owner/repo): ').strip()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        sys.exit('ERROR: Expected owner/repository, for example username/Mayham-Accounts.')
    if not key_path.exists():
        key = ec.generate_private_key(ec.SECP256R1())
        with key_path.open('xb') as stream:
            stream.write(key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()))
        print('Created local private signing key:',key_path)
    conf = {'repo': repo}
    config_file.write_text(json.dumps(conf, indent=2), encoding='utf-8')
if not key_path.exists():
    sys.exit('ERROR: Your signing key is missing. Restore your ORIGINAL private PEM key; do NOT create a new one for an already distributed updater.')
from cryptography.hazmat.primitives.serialization import load_pem_private_key
key = load_pem_private_key(key_path.read_bytes(), password=None)
if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1):
    sys.exit('ERROR: Signing key must be P-256')
nums=key.public_key().public_numbers()
public=f'{nums.x:064x}{nums.y:064x}'
if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',conf['repo']):
    sys.exit('ERROR: Repository setting is invalid')
# Only prints public metadata, safe to put into env. Password/key NEVER echoed.
print('MAYHAM_UPDATE_REPO='+conf['repo'])
print('MAYHAM_UPDATE_PUBLIC_KEY='+public)
print('MAYHAM_SIGNING_KEY_PATH='+str(key_path))
