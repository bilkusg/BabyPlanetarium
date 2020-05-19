/**
 * This is a small utility library of functions to draw arcs and text on a sphere in Babylon.js
 */

import * as Astro from "../astro/astro.js";
export function arcThrough(radecs:Array<Array<number>>,sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene) {
  const points = radecs.map(radec=>{
    const v1 = Astro.rhoThetaPhiToXYZ(sphereAt,radec[1],-radec[0]);
    return new BABYLON.Vector3(v1.x,v1.y,-v1.z);    
  });

  const lines = BABYLON.MeshBuilder.CreateLines(name, { points: points, useVertexAlpha:false}, scene);
  lines.color = color;
  if (parent) { lines.setParent(parent);};
  return lines;
}
export function arcSystemThrough(radecslist:Array<Array<Array<number>>>,sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene) {
  const points = function(radecs:Array<Array<number>>) {
    return radecs.map(radec=>{
    const v1 = Astro.rhoThetaPhiToXYZ(sphereAt,radec[1],-radec[0]);
    return new BABYLON.Vector3(v1.x,v1.y,-v1.z);
    });
  }
  const lineslist = radecslist.map(radecs=>{
    return points(radecs);
  });

  const lines = BABYLON.MeshBuilder.CreateLineSystem(name, { lines: lineslist, useVertexAlpha:false}, scene);
  lines.color = color;
  if (parent) { lines.setParent(parent);};
  return lines;
}
export function raCirclePoints(ra:number) {
  const p:Array<Array<number>> = [];
  for (let i=-90;i<=90;i=i+10)
    p.push([ra,i]);
  return p;
}
export function raCircle(ra:number,sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene):void {
  arcThrough(raCirclePoints(ra),sphereAt,name,color,parent,scene);
}
export function decCirclePoints(dec:number) {
  const p:Array<Array<number>> = [];
  for (let i=0;i<360;i=i+1) {
    p.push([i,dec]);
  }
  return p;  
}
export function decCircle(dec:number,sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene):void {
  arcThrough(decCirclePoints(dec),sphereAt,name,color,parent,scene);
}

export function raGrid(sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene) {
  const p:Array<Array<Array<number>>> = [];
  for (let i = 0;i< 360;i=i+30) {
    p.push(raCirclePoints(i));
  }
  return arcSystemThrough(p,sphereAt,name,color,parent,scene);
}
export function decGrid(sphereAt:number,name:string,color:any,parent:BABYLON.Mesh,scene:BABYLON.Scene) {
  const p:Array<Array<Array<number>>> = [];
  for (let i = -90;i<= 90;i=i+10) {
    p.push(decCirclePoints(i));
  }
  return arcSystemThrough(p,sphereAt,name,color,parent,scene);
}
export function createTextAtRaDec(ra:number,dec:number,sphereAt:number,text:string,textColor:string,scene:BABYLON.Scene) {
  const holder = BABYLON.Mesh.CreatePlane("textplane", sphereAt,scene);
  const adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(holder);
  const v1 = Astro.rhoThetaPhiToXYZ(sphereAt,dec,-ra);
  holder.position.x = v1.x;
  holder.position.y = v1.y;
  holder.position.z = -v1.z;
  holder.rotation.y = (180-ra) / Astro.DegsPerRad;
  holder.rotation.x = (-dec) / Astro.DegsPerRad;
  const textblock = new BABYLON.GUI.TextBlock();
  textblock.color = textColor;
  textblock.fontSize = 24;
  textblock.text=text;
  adt.addControl(textblock);
  return holder;
}
