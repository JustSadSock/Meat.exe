let rules={gravity:1,friction:0.9,enemySpeed:1,FOV:1,bloodLimit:500};

export function initMeta(){
  const saved=localStorage.getItem('meatRules');
  if(saved) rules=JSON.parse(saved);
}

export function mutateRules(){
  const keys=Object.keys(rules);
  const k=keys[Math.floor(Math.random()*keys.length)];
  rules[k]*=0.5+Math.random();
  localStorage.setItem('meatRules',JSON.stringify(rules));
  console.log('Meta-mutation:',k,rules[k]);
}

export function getRules(){
  return rules;
}
