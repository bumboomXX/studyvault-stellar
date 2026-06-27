use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};
use studyvault_policy::{StudyVaultPolicyContract, StudyVaultPolicyContractClient};

fn make_hash(env: &Env, value: u8) -> BytesN<32> {
    BytesN::from_array(env, &[value; 32])
}

fn setup<'a>(
    env: &'a Env,
) -> (
    StudyVaultContractClient<'a>,
    StudyVaultPolicyContractClient<'a>,
    Address,
    Address,
    Address,
) {
    env.mock_all_auths();

    let policy_id = env.register(StudyVaultPolicyContract, ());
    let vault_id = env.register(StudyVaultContract, ());

    let policy_client = StudyVaultPolicyContractClient::new(env, &policy_id);
    let vault_client = StudyVaultContractClient::new(env, &vault_id);

    let admin = Address::generate(env);
    let owner = Address::generate(env);
    let buyer = Address::generate(env);

    vault_client.initialize(&admin, &policy_id);

    (vault_client, policy_client, admin, owner, buyer)
}

#[test]
fn initializes_contract_with_policy() {
    let env = Env::default();
    let (vault_client, policy_client, admin, _owner, _buyer) = setup(&env);

    assert_eq!(vault_client.admin(), admin);
    assert_eq!(
        policy_client.policy_name(),
        String::from_str(&env, "StudyVaultPolicyV1")
    );
    assert_eq!(vault_client.stats(), (0, 0, 1));
}

#[test]
fn uploads_document_and_updates_indexes() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, _buyer) = setup(&env);

    let hash = make_hash(&env, 7);
    let title = String::from_str(&env, "Stellar Soroban Notes");
    let uri = String::from_str(&env, "ipfs://studyvault/soroban-notes");

    let document_id = vault_client.upload_document(&owner, &title, &hash, &uri, &100);

    let document = vault_client.get_document(&document_id);

    assert_eq!(document.id, 1);
    assert_eq!(document.owner, owner);
    assert_eq!(document.title, title);
    assert_eq!(document.document_hash, hash.clone());
    assert_eq!(document.metadata_uri, uri);
    assert_eq!(document.price, 100);
    assert_eq!(document.status, STATUS_ACTIVE);
    assert_eq!(vault_client.document_id_by_hash(&hash), document_id);
    assert_eq!(vault_client.owner_document_count(&owner), 1);
    assert_eq!(vault_client.owner_document_at(&owner, &0), document_id);
    assert_eq!(vault_client.stats(), (1, 0, 2));
}

#[test]
#[should_panic]
fn rejects_duplicate_document_hash() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, _buyer) = setup(&env);

    let hash = make_hash(&env, 9);
    let uri = String::from_str(&env, "ipfs://studyvault/duplicate");

    vault_client.upload_document(
        &owner,
        &String::from_str(&env, "First document"),
        &hash,
        &uri,
        &100,
    );

    vault_client.upload_document(
        &owner,
        &String::from_str(&env, "Duplicate document"),
        &hash,
        &uri,
        &100,
    );
}

#[test]
#[should_panic]
fn rejects_price_not_allowed_by_policy() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, _buyer) = setup(&env);

    vault_client.upload_document(
        &owner,
        &String::from_str(&env, "Free document rejected"),
        &make_hash(&env, 11),
        &String::from_str(&env, "ipfs://studyvault/free"),
        &0,
    );
}

#[test]
fn purchase_access_records_buyer() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, buyer) = setup(&env);

    let document_id = vault_client.upload_document(
        &owner,
        &String::from_str(&env, "DeFi Study Guide"),
        &make_hash(&env, 13),
        &String::from_str(&env, "ipfs://studyvault/defi-guide"),
        &250,
    );

    assert_eq!(vault_client.has_access(&buyer, &document_id), false);

    let purchased = vault_client.purchase_access(&buyer, &document_id, &250);
    let document = vault_client.get_document(&document_id);

    assert_eq!(purchased, true);
    assert_eq!(vault_client.has_access(&buyer, &document_id), true);
    assert_eq!(vault_client.has_access(&owner, &document_id), true);
    assert_eq!(document.purchases, 1);
    assert_eq!(vault_client.stats(), (1, 1, 2));
}

#[test]
#[should_panic]
fn rejects_underpaid_purchase() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, buyer) = setup(&env);

    let document_id = vault_client.upload_document(
        &owner,
        &String::from_str(&env, "Premium Rust Course"),
        &make_hash(&env, 15),
        &String::from_str(&env, "ipfs://studyvault/rust-course"),
        &500,
    );

    vault_client.purchase_access(&buyer, &document_id, &100);
}

#[test]
fn disables_document_and_blocks_purchase() {
    let env = Env::default();
    let (vault_client, _policy_client, _admin, owner, buyer) = setup(&env);

    let document_id = vault_client.upload_document(
        &owner,
        &String::from_str(&env, "Archived Notes"),
        &make_hash(&env, 17),
        &String::from_str(&env, "ipfs://studyvault/archived"),
        &100,
    );

    let disabled = vault_client.disable_document(&owner, &document_id);

    assert_eq!(disabled.status, STATUS_DISABLED);
    assert_eq!(
        vault_client.status_label(&disabled.status),
        String::from_str(&env, "Disabled")
    );
    assert_eq!(vault_client.has_access(&buyer, &document_id), false);
}
