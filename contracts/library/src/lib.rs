#![no_std]

use soroban_sdk::{
contract,
contractimpl,
contracttype,
symbol_short,
Address,
Env,
String,
};

#[derive(Clone)]
#[contracttype]
pub struct Document{
pub id:u32,
pub title:String,
pub hash:String,
pub owner:Address,
}

#[contracttype]
pub enum Key{
Count,
Doc(u32),
Hash(String),
Paid(Address,u32),
}

#[contract]
pub struct Library;

#[contractimpl]
impl Library{

pub fn upload(
env:Env,
owner:Address,
title:String,
hash:String,
){

owner.require_auth();

if env.storage()
.persistent()
.has(
&Key::Hash(
hash.clone()
)
){
return;
}

let id:u32=
env.storage()
.persistent()
.get(
&Key::Count
)
.unwrap_or(0);

let doc=
Document{
id,
title:title.clone(),
hash:hash.clone(),
owner:owner.clone(),
};

env.storage()
.persistent()
.set(
&Key::Doc(id),
&doc
);

env.storage()
.persistent()
.set(
&Key::Hash(hash),
&id
);

env.storage()
.persistent()
.set(
&Key::Count,
&(id+1)
);

env.events().publish(
(symbol_short!("UPLOAD"),id),
title
);

}

pub fn pay(
env:Env,
buyer:Address,
id:u32,
){

buyer.require_auth();

env.storage()
.persistent()
.set(
&Key::Paid(
buyer.clone(),
id
),
&true
);

env.events().publish(
(symbol_short!("PAY"),id),
buyer
);

}

pub fn access(
env:Env,
buyer:Address,
id:u32,
)->bool{

env.storage()
.persistent()
.get(
&Key::Paid(
buyer,
id
))
.unwrap_or(false)

}

}