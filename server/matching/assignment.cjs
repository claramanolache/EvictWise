// Maximum-weight capacitated bipartite matching via successive shortest residual paths.
// A negative cost is a compatibility benefit. Unmatched users contribute zero.
const SCALE = 1000000;
function maximizeCompatibility(userIds, capacities, edges) {
  if (!Array.isArray(userIds) || userIds.length > 100 || !Array.isArray(capacities) || capacities.length > 50 || !Array.isArray(edges) || edges.length > 5000) throw new Error('Demo graph exceeds supported limits.');
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
  const users = [...userIds].sort();
  const providers = [...capacities].sort((a,b) => a.organizationId < b.organizationId ? -1 : a.organizationId > b.organizationId ? 1 : 0);
  if (users.some(id=>!validId(id)) || new Set(users).size !== users.length || providers.some(p=>!validId(p.organizationId) || !Number.isInteger(p.slots) || p.slots < 0 || p.slots > 100) || new Set(providers.map(p=>p.organizationId)).size !== providers.length) throw new Error('Invalid or duplicate graph nodes.');
  const source=0, sink=users.length+providers.length+1;
  const graph=Array.from({length:sink+1},()=>[]);
  function add(from,to,capacity,cost) {
    const forward={to,capacity,cost,reverse:graph[to].length};
    const backward={to:from,capacity:0,cost:-cost,reverse:graph[from].length};
    graph[from].push(forward);graph[to].push(backward);return forward;
  }
  const userNodes=new Map(users.map((id,i)=>[id,i+1]));
  const providerNodes=new Map(providers.map((p,i)=>[p.organizationId,users.length+i+1]));
  users.forEach(id=>add(source,userNodes.get(id),1,0));
  providers.forEach(p=>add(providerNodes.get(p.organizationId),sink,p.slots,0));
  const seen=new Set(), candidates=[];
  for(const edge of [...edges].sort((a,b)=>`${a.userId}:${a.organizationId}` < `${b.userId}:${b.organizationId}` ? -1 : 1)) {
    const key=`${edge.userId}:${edge.organizationId}`;
    if(!userNodes.has(edge.userId) || !providerNodes.has(edge.organizationId) || seen.has(key) || !Number.isFinite(edge.score) || edge.score<0 || edge.score>100) throw new Error('Invalid or duplicate compatibility edge.');
    seen.add(key);
    const weight=Math.round(edge.score*SCALE);
    if(weight>0) candidates.push({...edge,weight,arc:add(userNodes.get(edge.userId),providerNodes.get(edge.organizationId),1,-weight)});
  }
  while(true) {
    const distance=Array(graph.length).fill(Infinity), previous=Array(graph.length).fill(null);
    distance[source]=0;
    // Bellman-Ford handles negative costs and reverse edges that undo earlier choices.
    for(let pass=0;pass<graph.length-1;pass++) {
      let changed=false;
      for(let from=0;from<graph.length;from++) {
        if(!Number.isFinite(distance[from])) continue;
        graph[from].forEach((arc,index)=>{
          if(arc.capacity>0 && distance[from]+arc.cost<distance[arc.to]) {
            distance[arc.to]=distance[from]+arc.cost;previous[arc.to]={from,index};changed=true;
          }
        });
      }
      if(!changed) break;
    }
    if(!Number.isFinite(distance[sink]) || distance[sink]>=0) break;
    for(let node=sink;node!==source;) {
      const {from,index}=previous[node], arc=graph[from][index];
      arc.capacity--;graph[node][arc.reverse].capacity++;node=from;
    }
  }
  const assignments=candidates.filter(edge=>edge.arc.capacity===0).map(({userId,organizationId,weight})=>({userId,organizationId,score:weight/SCALE}));
  const assigned=new Set(assignments.map(a=>a.userId));
  return { assignments, totalCompatibility: assignments.reduce((sum,a)=>sum+Math.round(a.score*SCALE),0)/SCALE,
    unmatched:users.filter(id=>!assigned.has(id)),
    capacityUsage:providers.map(p=>({...p,assigned:assignments.filter(a=>a.organizationId===p.organizationId).length})) };
}
module.exports={maximizeCompatibility};
