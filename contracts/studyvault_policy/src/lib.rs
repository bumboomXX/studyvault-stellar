#![no_std]

use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct StudyVaultPolicyContract;

#[contractimpl]
impl StudyVaultPolicyContract {
    pub fn policy_name(env: Env) -> String {
        String::from_str(&env, "StudyVaultPolicyV1")
    }

    pub fn minimum_price(_env: Env) -> i128 {
        1
    }

    pub fn maximum_price(_env: Env) -> i128 {
        10_000_000_000
    }

    pub fn is_price_allowed(env: Env, price: i128) -> bool {
        price >= Self::minimum_price(env.clone()) && price <= Self::maximum_price(env)
    }

    pub fn is_document_allowed(env: Env, price: i128) -> bool {
        Self::is_price_allowed(env, price)
    }
}
