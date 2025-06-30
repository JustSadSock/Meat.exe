let rules={gravity:1,friction:0.9,enemySpeed:1,FOV:1,bloodLimit:500};

function defaultBloodLimit(){
  const mem=navigator.deviceMemory||4;
  const cores=navigator.hardwareConcurrency||4;
  return Math.min(1500, Math.floor(250*mem + 50*cores));
}

export function initMeta(){
  const saved=localStorage.getItem('meatRules');
  if(saved){
    rules=JSON.parse(saved);
  } else {
    rules.bloodLimit=defaultBloodLimit();
  }
}

export function mutateRules(){
  const keys=Object.keys(rules);
  const k=keys[Math.floor(Math.random()*keys.length)];
  rules[k]*=0.5+Math.random();
  localStorage.setItem('meatRules',JSON.stringify(rules));
  console.log('Meta-mutation:',k,rules[k]);
}

export function setPerformanceSettings(opts={}){
  if(typeof opts.bloodLimit==='number') rules.bloodLimit=opts.bloodLimit;
  localStorage.setItem('meatRules',JSON.stringify(rules));
}

export function getRules(){
  return rules;
}
