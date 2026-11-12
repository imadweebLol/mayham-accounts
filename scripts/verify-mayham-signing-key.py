"""Refuse to publish if the private release key does not match the embedded public key."""
import os, sys
from pathlib import Path
from cryptography.hazmat.primitives.serialization import load_pem_private_key
key=load_pem_private_key(Path(os.environ['MAYHAM_UPDATE_LOCAL_KEY']).read_bytes(),password=None)
public=key.public_key().public_numbers()
expected=f'{public.x:064x}{public.y:064x}'
if expected.lower()!=os.environ['UPDATE_PUB'].lower():
    sys.exit('ERROR: Public key does not match the signing private key.')
print('Signing key matches published public key.')
