// Offline-only: no server route or app import enables this allocator.
const { rankLawyers, preferenceKeys, lawyerNeeds } = require('../../src/utils/lawyerRecommendations.ts');
const { maximizeCompatibility } = require('./assignment.cjs');
function matchDemoUsers(users,organizations,capacities) {
  if(!Array.isArray(users)||users.length>100 || !Array.isArray(organizations)||organizations.length>50) throw new Error('Demo input exceeds supported limits.');
  for(const user of users) {
    if(user?.synthetic!==true || typeof user.id!=='string' || typeof user.preferredLanguage!=='string' || !Array.isArray(user.preferences?.needs) || user.preferences.needs.some(need=>!lawyerNeeds.includes(need)) || preferenceKeys.some(key=>!Number.isInteger(user.preferences.weights?.[key]) || user.preferences.weights[key]<1 || user.preferences.weights[key]>10)) throw new Error('Invalid synthetic matching profile.');
  }
  const ids=new Set(organizations.map(o=>o.id));
  if(!Array.isArray(capacities) || ids.size!==organizations.length || capacities.length!==organizations.length || capacities.some(c=>!ids.has(c.organizationId))) throw new Error('Every organization must have an explicit demo capacity.');
  const pairs=[];
  for(const user of users) {
    for(const result of rankLawyers(organizations,user.preferences,user.location,user.preferredLanguage)) {
      // Same eligibility rule as live recommendations: at least one requested service.
      if(result.serviceMatch) pairs.push({userId:user.id,organizationId:result.organization.id,score:result.rawScore,
        matchedServices:result.matchedServices,languageMatch:result.languageMatch,distanceMiles:result.distanceMiles});
    }
  }
  const solution=maximizeCompatibility(users.map(u=>u.id),capacities,pairs);
  return { demoOnly:true, liveEnabled:false,
    disclaimer:'Synthetic users and fabricated slot counts. Prices are fabricated for testing. This does not reserve appointments or represent real provider availability.',
    objective:'Maximize total compatibility, rounded to six decimal places; unmatched users contribute zero.',
    userCount:users.length,eligiblePairCount:pairs.length,totalCompatibility:solution.totalCompatibility,
    assignments:solution.assignments.map(a=>{
      const edge=pairs.find(p=>p.userId===a.userId && p.organizationId===a.organizationId);
      return {...a,organizationName:organizations.find(o=>o.id===a.organizationId).name,
        matchedServices:edge.matchedServices,languageMatch:edge.languageMatch,distanceMiles:edge.distanceMiles};
    }),
    unmatched:solution.unmatched.map(userId=>({userId,reason:pairs.some(p=>p.userId===userId)?'Not selected under capacities and the total-compatibility objective.':'No requested service matches a listed organization.'})),
    capacityUsage:solution.capacityUsage };
}
module.exports={matchDemoUsers};
