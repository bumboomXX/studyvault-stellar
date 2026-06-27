#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String,
};
use studyvault_policy::StudyVaultPolicyContractClient;

const STATUS_ACTIVE: u32 = 1;
const STATUS_DISABLED: u32 = 2;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StudyVaultError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    DuplicateDocumentHash = 4,
    DocumentNotFound = 5,
    DocumentDisabled = 6,
    PriceRejectedByPolicy = 7,
    PaymentTooLow = 8,
    NotDocumentOwner = 9,
    OwnerIndexNotFound = 10,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DocumentRecord {
    pub id: u32,
    pub owner: Address,
    pub title: String,
    pub document_hash: BytesN<32>,
    pub metadata_uri: String,
    pub price: i128,
    pub uploaded_at_ledger: u32,
    pub purchases: u32,
    pub status: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    PolicyContract,
    NextDocumentId,
    TotalDocuments,
    TotalPurchases,
    Document(u32),
    DocumentByHash(BytesN<32>),
    OwnerDocumentCount(Address),
    OwnerDocumentAt(Address, u32),
    Access(Address, u32),
}

#[contract]
pub struct StudyVaultContract;

#[contractimpl]
impl StudyVaultContract {
    pub fn initialize(env: Env, admin: Address, policy_contract: Address) {
        admin.require_auth();

        if env.storage().persistent().has(&DataKey::Admin) {
            env.panic_with_error(StudyVaultError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::PolicyContract, &policy_contract);
        env.storage()
            .persistent()
            .set(&DataKey::NextDocumentId, &1_u32);
        env.storage()
            .persistent()
            .set(&DataKey::TotalDocuments, &0_u32);
        env.storage()
            .persistent()
            .set(&DataKey::TotalPurchases, &0_u32);
    }

    pub fn admin(env: Env) -> Address {
        Self::read_admin(&env)
    }

    pub fn policy_contract(env: Env) -> Address {
        Self::read_policy_contract(&env)
    }

    pub fn set_policy_contract(env: Env, admin: Address, policy_contract: Address) {
        admin.require_auth();

        let stored_admin = Self::read_admin(&env);

        if stored_admin != admin {
            env.panic_with_error(StudyVaultError::NotAdmin);
        }

        env.storage()
            .persistent()
            .set(&DataKey::PolicyContract, &policy_contract);
    }

    pub fn upload_document(
        env: Env,
        owner: Address,
        title: String,
        document_hash: BytesN<32>,
        metadata_uri: String,
        price: i128,
    ) -> u32 {
        owner.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::DocumentByHash(document_hash.clone()))
        {
            env.panic_with_error(StudyVaultError::DuplicateDocumentHash);
        }

        let policy_contract = Self::read_policy_contract(&env);
        let policy_client = StudyVaultPolicyContractClient::new(&env, &policy_contract);

        if !policy_client.is_document_allowed(&price) {
            env.panic_with_error(StudyVaultError::PriceRejectedByPolicy);
        }

        let next_id = Self::next_document_id(&env);
        let ledger = env.ledger().sequence();

        let record = DocumentRecord {
            id: next_id,
            owner: owner.clone(),
            title,
            document_hash: document_hash.clone(),
            metadata_uri,
            price,
            uploaded_at_ledger: ledger,
            purchases: 0,
            status: STATUS_ACTIVE,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Document(next_id), &record);
        env.storage()
            .persistent()
            .set(&DataKey::DocumentByHash(document_hash), &next_id);

        let owner_count = Self::owner_document_count(env.clone(), owner.clone());
        env.storage().persistent().set(
            &DataKey::OwnerDocumentAt(owner.clone(), owner_count),
            &next_id,
        );
        env.storage()
            .persistent()
            .set(&DataKey::OwnerDocumentCount(owner), &(owner_count + 1));

        let total_documents = Self::total_documents(&env);
        env.storage()
            .persistent()
            .set(&DataKey::TotalDocuments, &(total_documents + 1));
        env.storage()
            .persistent()
            .set(&DataKey::NextDocumentId, &(next_id + 1));

        next_id
    }

    pub fn get_document(env: Env, document_id: u32) -> DocumentRecord {
        Self::get_document_internal(&env, document_id)
    }

    pub fn document_id_by_hash(env: Env, document_hash: BytesN<32>) -> u32 {
        let value: Option<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::DocumentByHash(document_hash));

        match value {
            Some(document_id) => document_id,
            None => env.panic_with_error(StudyVaultError::DocumentNotFound),
        }
    }

    pub fn owner_document_count(env: Env, owner: Address) -> u32 {
        let value: Option<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerDocumentCount(owner));

        value.unwrap_or(0)
    }

    pub fn owner_document_at(env: Env, owner: Address, index: u32) -> u32 {
        let value: Option<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerDocumentAt(owner, index));

        match value {
            Some(document_id) => document_id,
            None => env.panic_with_error(StudyVaultError::OwnerIndexNotFound),
        }
    }

    pub fn purchase_access(env: Env, buyer: Address, document_id: u32, payment: i128) -> bool {
        buyer.require_auth();

        let mut document = Self::get_document_internal(&env, document_id);

        if document.status != STATUS_ACTIVE {
            env.panic_with_error(StudyVaultError::DocumentDisabled);
        }

        if payment < document.price {
            env.panic_with_error(StudyVaultError::PaymentTooLow);
        }

        if !Self::has_access(env.clone(), buyer.clone(), document_id) {
            env.storage()
                .persistent()
                .set(&DataKey::Access(buyer, document_id), &true);

            document.purchases += 1;

            env.storage()
                .persistent()
                .set(&DataKey::Document(document_id), &document);

            let total_purchases = Self::total_purchases(&env);
            env.storage()
                .persistent()
                .set(&DataKey::TotalPurchases, &(total_purchases + 1));
        }

        true
    }

    pub fn has_access(env: Env, user: Address, document_id: u32) -> bool {
        let document = Self::get_document_internal(&env, document_id);

        if document.owner == user {
            return true;
        }

        let access: Option<bool> = env
            .storage()
            .persistent()
            .get(&DataKey::Access(user, document_id));

        access.unwrap_or(false)
    }

    pub fn disable_document(env: Env, owner: Address, document_id: u32) -> DocumentRecord {
        owner.require_auth();

        let mut document = Self::get_document_internal(&env, document_id);

        if document.owner != owner {
            env.panic_with_error(StudyVaultError::NotDocumentOwner);
        }

        document.status = STATUS_DISABLED;

        env.storage()
            .persistent()
            .set(&DataKey::Document(document_id), &document);

        document
    }

    pub fn stats(env: Env) -> (u32, u32, u32) {
        (
            Self::total_documents(&env),
            Self::total_purchases(&env),
            Self::next_document_id(&env),
        )
    }

    pub fn status_label(env: Env, status: u32) -> String {
        if status == STATUS_ACTIVE {
            return String::from_str(&env, "Active");
        }

        if status == STATUS_DISABLED {
            return String::from_str(&env, "Disabled");
        }

        String::from_str(&env, "Unknown")
    }

    fn read_admin(env: &Env) -> Address {
        let value: Option<Address> = env.storage().persistent().get(&DataKey::Admin);

        match value {
            Some(admin) => admin,
            None => env.panic_with_error(StudyVaultError::NotInitialized),
        }
    }

    fn read_policy_contract(env: &Env) -> Address {
        let value: Option<Address> = env.storage().persistent().get(&DataKey::PolicyContract);

        match value {
            Some(policy_contract) => policy_contract,
            None => env.panic_with_error(StudyVaultError::NotInitialized),
        }
    }

    fn get_document_internal(env: &Env, document_id: u32) -> DocumentRecord {
        let value: Option<DocumentRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::Document(document_id));

        match value {
            Some(document) => document,
            None => env.panic_with_error(StudyVaultError::DocumentNotFound),
        }
    }

    fn next_document_id(env: &Env) -> u32 {
        let value: Option<u32> = env.storage().persistent().get(&DataKey::NextDocumentId);
        value.unwrap_or(1)
    }

    fn total_documents(env: &Env) -> u32 {
        let value: Option<u32> = env.storage().persistent().get(&DataKey::TotalDocuments);
        value.unwrap_or(0)
    }

    fn total_purchases(env: &Env) -> u32 {
        let value: Option<u32> = env.storage().persistent().get(&DataKey::TotalPurchases);
        value.unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
