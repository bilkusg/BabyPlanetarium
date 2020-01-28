import * as Astro from "../astro/astro.js";
export function lineBetween(ra1:number,dec1:number,ra2:number,dec2:number,sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene) {
  const v1 = Astro.rhoThetaPhiToXYZ(1,dec1,-ra1);
  const v2 = Astro.rhoThetaPhiToXYZ(1,dec2,-ra2);

  const points = [0,1,2,3,4,5,6,7,8,9,10].map(i => {
    let vx = v1.x + (v2.x-v1.x) * i / 10;
    let vy = v1.y + (v2.y-v1.y) * i / 10;
    let vz = v1.z + (v2.z-v1.z) * i / 10;
    const len = Math.sqrt(vx*vx+vy*vy+vz*vz);
    vx = vx / len * sphereAt;
    vy = vy / len * sphereAt;
    vz = vz / len * sphereAt;
    return new BABYLON.Vector3(vx,vy,-vz);
  });
  const lines = BABYLON.MeshBuilder.CreateLines(name, { points: points }, scene);
  lines.color = color;
  if (parent) { lines.setParent(parent);};
  return lines;
}
// dec and ra are supplied
export function polygonVia(pointsList:Array<Array<number>>,sphereAt:number,name:string,color:any,parent:any,scene:any):void {
  let l = pointsList.length;
  let meshArray = [];
  if ( l < 2 ) return null;
  for(let i = 0;i<l-1;i++) {
  let p1 = pointsList[i];
  let p2 = pointsList[i+1];
  let lin = lineBetween(p1[0],p1[1],p2[0],p2[1],sphereAt,name+i.toString(),color,parent,scene);
    meshArray.push(lin);
  }
  let p1 = pointsList[l-1];
  let p2 = pointsList[0];
  let lin = lineBetween(p1[0],p1[1],p2[0],p2[1],sphereAt,name+(l-1).toString(),color,parent,scene);
  meshArray.push(lin);
  // return BABYLON.Mesh.MergeMeshes(meshArray);
}
export function pathBetween(pointsList:Array<Array<number>>,sphereAt:number,name:string,color:any,parent:any,scene:any):void {
  let l = pointsList.length;
  let meshArray = [];
  if ( l < 2 ) return null;
  for(let i = 0;i<l-1;i++) {
  let p1 = pointsList[i];
  let p2 = pointsList[i+1];
    meshArray.push(lineBetween(p1[0],p1[1],p2[0],p2[1],sphereAt,name+i.toString(),color,parent,scene));
  }
  //return BABYLON.Mesh.MergeMeshes(meshArray);
}
export function createTextAtRaDec(ra:number,dec:number,sphereAt:number,text:string,textColor:string,scene:BABYLON.Scene) {
  let holder = BABYLON.Mesh.CreatePlane("textplane", sphereAt,scene);
  let adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(holder);
  const v1 = Astro.rhoThetaPhiToXYZ(sphereAt,dec,-ra);
  holder.position.x = v1.x;
  holder.position.y = v1.y;
  holder.position.z = -v1.z;
  holder.rotation.y = (180-ra) / Astro.DegsPerRad;
  holder.rotation.x = (-dec) / Astro.DegsPerRad;
  let textblock = new BABYLON.GUI.TextBlock();
  textblock.color = textColor;
  textblock.fontSize = 24;
  textblock.text=text;
  adt.addControl(textblock);
  return holder;
}
