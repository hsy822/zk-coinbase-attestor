use std::ecdsa_secp256k1::verify_signature;

fn main(
    tx_hash: [u8; 32],
    coinbase_sig: [u8; 64],
    user_pubkey_x: [u8; 32],
    user_pubkey_y: [u8; 32],
    user_sig: [u8; 64],

    coinbase_pubkey_x: pub [u8; 32],
    coinbase_pubkey_y: pub [u8; 32],
) {
    let coinbase_valid = verify_signature(
        coinbase_pubkey_x,
        coinbase_pubkey_y,
        coinbase_sig,
        tx_hash,
    );
    assert(coinbase_valid);

    let user_valid = verify_signature(
        user_pubkey_x,
        user_pubkey_y,
        user_sig,
        tx_hash,
    );
    assert(user_valid);
}