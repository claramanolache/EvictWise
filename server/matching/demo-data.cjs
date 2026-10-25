// All users, coordinates, preferences and capacity numbers in this file are fictional test data.
const capacities = [
  { organizationId:'bay-area-legal-aid',slots:1 },
  { organizationId:'clsepa',slots:2 },
  { organizationId:'eviction-defense-collaborative',slots:1 },
  { organizationId:'law-foundation-silicon-valley',slots:1 },
  { organizationId:'legal-aid-san-mateo',slots:1 },
  { organizationId:'project-sentinel',slots:2 },
];
function makeUsers() {
  const places=[['Palo Alto','Santa Clara',37.4419,-122.143],['San Jose','Santa Clara',37.3382,-121.8863],['San Francisco','San Francisco',37.7749,-122.4194],['Redwood City','San Mateo',37.4852,-122.2364]];
  const needs=[['eviction defense'],['tenant counseling','mediation'],['fair housing'],['eviction defense','tenant counseling']];
  return Array.from({length:12},(_,i)=>{
    const [city,county,latitude,longitude]=places[i%places.length];
    return {synthetic:true,id:`demo-tenant-${String(i+1).padStart(2,'0')}`,displayName:`Fictional Tenant ${i+1}`,
      location:{city,county,state:'California',country:'USA',latitude,longitude},preferredLanguage:['en','es','vi','fr'][i%4],
      preferences:{needs:i===11?[]:needs[i%4],weights:{lawyerPriorityProximity:1+(i*3)%10,lawyerPrioritySpecialization:1+(i*7)%10,lawyerPriorityLanguage:1+(i*5)%10,lawyerPriorityAffordability:1+(i*9)%10}}};
  });
}
module.exports={makeUsers,capacities};
