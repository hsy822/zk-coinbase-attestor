use dep::keccak256::keccak256;
use std::ecdsa_secp256k1::verify_signature;

fn main(
    calldata: [u8; 64],               // attestation calldata
    user_sig: [u8; 64],               // user's signature over digest
    coinbase_sig: [u8; 64],           // signature from Coinbase attestor over digest

    user_pubkey_x: [u8; 32],
    user_pubkey_y: [u8; 32],

    coinbase_pubkey_x: pub [u8; 32],  // public input for verification
    coinbase_pubkey_y: pub [u8; 32],
) {
    // Step 1: compute digest
    let digest = keccak256(calldata, 64);

    // Step 2: verify digest was signed by Coinbase attestor
    let verified_cb = verify_signature(
        coinbase_pubkey_x,
        coinbase_pubkey_y,
        coinbase_sig,
        digest
    );
    assert(verified_cb);

    // Step 3: verify digest was signed by user
    let verified_user = verify_signature(
        user_pubkey_x,
        user_pubkey_y,
        user_sig,
        digest
    );
    assert(verified_user);

    // Step 4: enforce function selector == `attestAccount(address)` -> 0x56feed5e
    assert(calldata[0] == 0x56);
    assert(calldata[1] == 0xfe);
    assert(calldata[2] == 0xed);
    assert(calldata[3] == 0x5e);
}