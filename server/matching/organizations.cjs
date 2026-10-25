const { DatabaseSync } = require('node:sqlite');
function readOrganizations(filename) {
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    return db.prepare('SELECT * FROM organizations ORDER BY id').all().map(org=>{
      const coordinates=db.prepare('SELECT latitude,longitude FROM organization_coordinates WHERE organization_id=? AND address=?').get(org.id,org.address);
      const price=db.prepare('SELECT consultation_usd FROM organization_test_prices WHERE organization_id=? AND fabricated_for_testing=1').get(org.id);
      return {id:org.id,name:org.name,latitude:coordinates?.latitude??null,longitude:coordinates?.longitude??null,
        testPriceUsd:price?.consultation_usd??null,priceFabricatedForTesting:!!price,
        counties:db.prepare('SELECT county FROM organization_counties WHERE organization_id=? ORDER BY county').all(org.id).map(r=>r.county),
        services:db.prepare('SELECT service FROM organization_services WHERE organization_id=? ORDER BY service').all(org.id).map(r=>r.service),
        languages:db.prepare('SELECT language FROM organization_languages WHERE organization_id=? ORDER BY language').all(org.id).map(r=>r.language)};
    });
  } finally {db.close();}
}
module.exports={readOrganizations};
