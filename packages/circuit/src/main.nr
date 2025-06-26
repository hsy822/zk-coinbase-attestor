use std::ecdsa_secp256k1::verify_signature;
use dep::ecrecover::ecrecover;

global COINBASE_PUBKEY_X: [u8; 32] = [
    110, 2, 155, 136, 43, 202, 15, 113,
    253, 226, 124, 73, 244, 53, 240,
    157, 69, 141, 81, 241, 61, 245, 141,
    63, 184, 147, 52, 148, 64, 19, 199, 198
];

global COINBASE_PUBKEY_Y: [u8; 32] = [
    39, 57, 45, 60, 108, 85, 171, 1,
    112, 223, 37, 76, 109, 91, 178, 131,
    212, 100, 46, 216, 65, 17, 184, 195,
    43, 158, 154, 14, 0, 147, 58, 140
];

fn main(
    digest: [u8; 32],

    calldata: [u8; 36],               // attestation calldata
    user_sig: [u8; 64],               // user's signature over digest
    coinbase_sig: [u8; 64],           // signature from Coinbase attestor over digest

    user_pubkey_x: [u8; 32],
    user_pubkey_y: [u8; 32],

    coinbase_pubkey_x: pub [u8; 32],  // public input for verification
    coinbase_pubkey_y: pub [u8; 32],
) {
    // Step 1: verify Coinbase pubkey
    assert(coinbase_pubkey_x == COINBASE_PUBKEY_X);
    assert(coinbase_pubkey_y == COINBASE_PUBKEY_Y);

    // Step 2: verify digest was signed by Coinbase attestor
    let verified_cb = verify_signature(
        coinbase_pubkey_x,
        coinbase_pubkey_y,
        coinbase_sig,
        digest
    );
    assert(verified_cb);

    // Step 3: verify digest was signed by user
    let user_address = ecrecover(
        user_pubkey_x,
        user_pubkey_y,
        user_sig,
        digest,
    );
    let addr_in_calldata = extract_address_from_calldata(calldata);
    assert(user_address == addr_in_calldata);

    // Step 4: enforce function selector == `attestAccount(address)` -> 0x56feed5e
    assert(calldata[0] == 0x56);
    assert(calldata[1] == 0xfe);
    assert(calldata[2] == 0xed);
    assert(calldata[3] == 0x5e);
}

pub fn extract_address_from_calldata(calldata: [u8; 36]) -> Field {
    let mut addr: Field = 0;
    for i in 0..20 {
        let byte = calldata[i + 16];
        addr = addr * 256.into() + byte.into();
    }
    addr
}