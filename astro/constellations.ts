import * as ConstellationData from "./constellationdata.js";
export let constellations:any = {};
export function getConstellationData() {

  ConstellationData.constellationBounds.features.forEach(
    c=>{ 
      let cid = constellations[c.id];
      if (!cid) cid = {id:c.id};
      cid.boundaryPoints = c.geometry.coordinates[0];
      constellations[c.id] = cid;
    }
  );
  ConstellationData.constellationLines.features.forEach(
    c=>{ 
      let cid = constellations[c.id];
      if (!cid) cid = {id:c.id};
      cid.lines = c.geometry.coordinates;
      constellations[c.id] = cid;
    }
  );
  ConstellationData.constellations.features.forEach(
    c=>{ 
      let cid = constellations[c.id];
      if (!cid) cid = {id:c.id};
      cid.coords = c.geometry.coordinates;
      constellations[c.id] = cid;
    }
  );
}

getConstellationData();