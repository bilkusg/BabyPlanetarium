// We import some required libraries
import * as Astro from "../astro/astro.js";
import * as Stars from "./stars.js";
import * as Constellations from "../astro/constellations.js";
import * as BabyLife from "..//babylife/babylife.js";
import * as SaturnRings from "../astro/saturnrings.js";
import * as Arcs from "./arcs.js";

let solarSystemResult:Astro.SolarSystemResult = null; // stores the result of calculating the solar system parameters

export function runBabySky() {
const DegsPerRad = Astro.DegsPerRad;

// Grab initial parameters from the url and define a few more
let theUrl = new URL(window.location.href);
const numericParamWithDefault = function(param:string,deft:number):number {
  let val = theUrl.searchParams.get(param);
  return (val ? Number(val) : deft);
}
/* These parameters can be set on startup by the default entry screen */
const defaultLatitude = numericParamWithDefault("latitude",52.0);
const defaultLongitude = numericParamWithDefault("longitude",-0.1);
const dateParam = theUrl.searchParams.get("date");
const explicitStartDate = dateParam? new Date(dateParam) : new Date();
const defaultHoursOffset = numericParamWithDefault("hours",0);
const defaultDaysOffset = numericParamWithDefault("days",0);

/* These parameters can be set on startup by explicit parameter passing to sky.html (advanced use and testing)*/
const defaultBrighten = numericParamWithDefault("brighten",1.5849);
const defaultStarPointSize = numericParamWithDefault("starPointSize",3) ;
const defaultMinMag = numericParamWithDefault("minMag",-4.0);
const defaultMaxMag = numericParamWithDefault("maxMag",5.5);
const defaultSpeed = numericParamWithDefault("speed",0);
const defaultPlanetMult = numericParamWithDefault("planetMult",1);
const defaultAuScaling = numericParamWithDefault("auScaling",1.0E-8);
const useLogarithmic = !! numericParamWithDefault("useLogarithmic",0);
const moonFudge = 100.0; 

let starDistance = 2E13*defaultAuScaling;
// Scaling:
// The solar system out to neptune is approximately 1.0E13m
// The stars are much further away obviously.
// However, rendering anything at a distance much greater than 1E5 starts to cause
// problems because of the limited precision of the gpu on the oculus
// And rendering anything much closer than 1E4 causes visible parallax when
// moving the eyes at ground level.
//
// So somehow we have to cram all our objects into a fairly small range of distances.
// The way we do this is as follows
//
// By default we scale our solar system object distances by 10E-8
// This sets our typical object at a distance of about 1E4-1E5 
//
// The moon has to be scaled further out that this would suggest, so we artificially move it out by a factor of 100
//
// The stars need to be relatively close, so we put those about twice as far as Neptune but no further.
//
// Now, in order to ensure that each planet is lit correctly (in terms of angle from the sun when we show disks) we give each planet
// its own light source from exactly the right direction. We can't use a single point light because we scale different objects (moon, planets) 
// differently.

// Timing:
// We want to be able to use a consistent point in time for our calculations of position &c, and this is the
// currentProgramTime variable. This is updated by a tick function in one of the components.
// Our challenge is that we don't want the program time to necessarily be the same as real time
// We may want an offset start time
// We may want time to run slower faster than usual or even backwards
// So the following functions take care of all that

class ProgramTime {
  nTimeIncrements:number = 10;
  timeIncrementTexts = ["stop", "1s","1m","10m","1h","1sidDay","1Day","1mth","1sidYr","1Yr"];
  timeIncrementIndex = 3;
  timeIncrements: Array<number>;
  currentSpeedIndex:number;
  programStartTime:Date;
  initialProgramTime:Date;
  currentProgramTime:Date
  currentAstroTime:Astro.AstroTime
  constructor(startDate:Date,daysOffset:number,hoursOffset:number,speedIndex:number) {
    this.timeIncrements = [
      0,
      1,
      60,
      600,
      3600,
      3600*24*365.25/366.25,
      3600*24,
      3600*24*30,
      3600*24*30*365.25/366.25,
      3600*24*365];
    this.currentSpeedIndex = speedIndex;
    this.programStartTime = new Date();
    this.initialProgramTime =  startDate ? startDate : this.programStartTime;
    this.initialProgramTime = new Date(
    this.initialProgramTime.getTime() + (1000 * 3600 * (daysOffset * 24 + hoursOffset))
    );
    this.currentProgramTime = this.initialProgramTime;
    this.currentAstroTime = new Astro.AstroTime(this.currentProgramTime);
  }
  setSpeed(s:number) {
    if (this.currentSpeedIndex == s) return;
    this.setProgramTime();
    this.currentSpeedIndex = s;
    this.programStartTime = new Date();
    this.initialProgramTime = this.currentProgramTime;
    this.setProgramTime();
    return;
  }
  setSpeedFromIncrement() {
    this.setSpeed(this.timeIncrementIndex);
  }
  stopSpeed() {
    this.setSpeed(0);
  }
  speedFactor() {
    if (this.currentSpeedIndex >= 0) return this.timeIncrements[this.currentSpeedIndex];
    return -this.timeIncrements[-this.currentSpeedIndex];
  }
  setTimeIncrement(n:number) {
    if (n > this.nTimeIncrements-1) {}
    else if (n <= 0) {} 
    else {
      this.timeIncrementIndex = n;
    } 
  }
  applyTimeIncrementForward() {
     this.initialProgramTime = new Date(this.initialProgramTime.getTime() + this.timeIncrement()*1000);
  }
  applyTimeIncrementBackward() {
     this.initialProgramTime = new Date(this.initialProgramTime.getTime() - this.timeIncrement()*1000);
  }
  fasterIncrement() {
    this.timeIncrementIndex = this.timeIncrementIndex + 1;
    if ( this.timeIncrementIndex == this.nTimeIncrements) {
      this.timeIncrementIndex = 1;
    }
  }
  timeIncrement() {
    return this.timeIncrements[this.timeIncrementIndex];
  }
  timeIncrementText() {
    return this.timeIncrementTexts[this.timeIncrementIndex];
  }
// This function updates currentProgramTime from the elapsed time and the speed
  setProgramTime() {
    const d = new Date();
    let elapsed = d.getTime() - this.programStartTime.getTime();
    elapsed = elapsed - (elapsed % 1000); // count in seconds
    this.currentProgramTime = new Date(this.initialProgramTime.getTime() + this.speedFactor()*elapsed);
    this.currentAstroTime = new Astro.AstroTime(this.currentProgramTime);
    return this.currentProgramTime;
  }
  getCurrentProgramTime() {
    return this.currentProgramTime.getTime();
  }
  getCurrentProgramTimeAsDate() {
    return this.currentProgramTime;
  }
  getCurrentProgramTimeAsAstroTime() {
    return this.currentAstroTime;
  }
// This function allows the speed of time passing to be changed during program execution needs to be fixed BLIXBLIX
};
let programTime = new ProgramTime(explicitStartDate,defaultDaysOffset,defaultHoursOffset,defaultSpeed);
const sceneParameters = {
    auScaling: defaultAuScaling,
    latitude: defaultLatitude,
    longitude: defaultLongitude,
    programTime: programTime.getCurrentProgramTime(),
    skyColor: "#0BF",
    skyOpacity: 0,
    rotateWorld: {x:0,y:0,z:0},
    maxMag: defaultMaxMag,
    minMag: defaultMinMag,
    brighten: defaultBrighten,
    planetMult: defaultPlanetMult,
    altazLinesVisible: false,
    radecLinesVisible: false,
    floorVisible: true,
    daylightVisible: true,
    labelsVisible: true,
    showConstellLines: false,
    showConstellBoundaries: false,
    useMainCamera: true,
    useSunCamera: false,
    starPointSize: defaultStarPointSize,
    sunAt: { x:0,y:1000,z:0},
    currentTimeIncrement: 3600*24,
    controllerRotationQuaternion: new BABYLON.Quaternion(),
    eastText: "E",
    helpVisible: true,
};
// Set up our environment and VR stuff
let canvas:HTMLCanvasElement = document.getElementById("renderCanvas") as HTMLCanvasElement; // Get the canvas element 
let engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
let scene = new BABYLON.Scene(engine);

scene.clearColor = new BABYLON.Color4(0,0,0,1);
scene.blockMaterialDirtyMechanism = true;

let VRHelper = scene.createDefaultVRExperience({useXR:true,defaultLightingOnControllers:false,rayLength:1E6,laserToggle:false,useMultiview: false});
VRHelper.enableInteractions();
VRHelper.setLaserColor(new BABYLON.Color3(0.5,0.9,0.1),new BABYLON.Color3(0.5,0.5,0.1));
VRHelper.setGazeColor(new BABYLON.Color3(0.1,0.1,0.9),new BABYLON.Color3(0.5,0.5,0.1));
scene.activeCamera.maxZ = starDistance * 3;
VRHelper.onAfterEnteringVRObservable.add(()=>{
  scene.activeCamera.maxZ = starDistance * 3;
  VRHelper.setLaserColor(new BABYLON.Color3(0.5,0.1,0.1));
}); 
scene.registerBeforeRender( function onceOnly() {
  let laserPointers = scene.getMeshesByID("laserPointer");
  if(laserPointers.length >= 2) {
    laserPointers.forEach((pointer)=> { 
      let m:any = pointer.material;
           // pointer.material.diffuseColor = BABYLON.Color3.Black();
      m.disableLighting = true;
    })
  }
  scene.unregisterBeforeRender(onceOnly);
});


// The scene creation function
const buildSkyScene = function (engine:BABYLON.Engine,scene:BABYLON.Scene) {
// BABYLON.SceneOptimizer.OptimizeAsync(scene);

let assetsManager=new BABYLON.AssetsManager(scene);

// Forward references for globals
let interactionHandler:InteractionHandler;
let selectedStarText = "";

let bScene = new BabyLife.BabyScene(scene, sceneParameters);
let moonlight; // not currently used

const updateProgramTime = function(always?:boolean) {
  let startProgramTime = programTime.getCurrentProgramTime();
  programTime.setProgramTime();
  let newProgramTime = programTime.getCurrentProgramTime();
  if (always || (newProgramTime !== startProgramTime) || bScene.hasChanged("latitude") || bScene.hasChanged("longitude")) {
    solarSystemResult = Astro.calcSolarSystem(bScene.valueOf("latitude"),bScene.valueOf("longitude"),programTime.getCurrentProgramTimeAsAstroTime(),bScene.valueOf("auScaling"));
    bScene.changeState({programTime:newProgramTime});
  }
}
// The sky component - renders nothing but allows rotation to correspond to latitude and longitude
let bSky = new BabyLife.BabyEntity(bScene);
bSky.dependsOn(["latitude","longitude","programTime"]);
bSky.setInit((me,bScene)=>{
  updateProgramTime(true);
  me.mesh = new BABYLON.TransformNode("sky");
});
bSky.setUpdate((me,bScene)=>{
  let houranglerads = Astro.localSiderealDegrees(programTime.getCurrentProgramTimeAsAstroTime(),bScene.currentState().longitude) / DegsPerRad;
  let latitudeQ = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X,(90-bScene.currentState().latitude)/DegsPerRad);
  let longitudeQ = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,(houranglerads));
  me.mesh.rotationQuaternion = latitudeQ.multiply(longitudeQ);
});

let bRadecLines = new BabyLife.BabyEntity(bScene,bSky);
bRadecLines.dependsOn(["radecLinesVisible","programTime"]);
bRadecLines.setInit((me,bScene)=>{
  me.mesh = new BABYLON.TransformNode("radecLines");
  me.mesh.setParent(bSky.mesh);
  me.mesh.setEnabled(false);
  Arcs.raGrid(starDistance * 0.7,"RA",new BABYLON.Color3(0.1,0.1,0.05),me.mesh,bScene.scene);
  Arcs.decGrid(starDistance * 0.7,"DEC",new BABYLON.Color3(0.1,0.1,0.05),me.mesh,bScene.scene);
});
bRadecLines.setUpdate((me,bScene)=>{
  if (me.mesh) {
    me.mesh.setEnabled(bScene.valueOf("radecLinesVisible"));
  
  }
});
let bAltazLines = new BabyLife.BabyEntity(bScene);
bAltazLines.dependsOn(["altazLinesVisible","programTime"]);
bAltazLines.setInit((me,bScene)=>{
  me.mesh = new BABYLON.TransformNode("altazLines");
  me.mesh.setEnabled(false);
  Arcs.raGrid(starDistance * 0.7,"AZ",new BABYLON.Color3(0.05,0.1,0.05),me.mesh,bScene.scene);
  Arcs.decGrid(starDistance * 0.7,"ALT",new BABYLON.Color3(0.05,0.1,0.05),me.mesh,bScene.scene);
});
bAltazLines.setUpdate((me,bScene)=>{
  if (me.mesh) {
    me.mesh.setEnabled(bScene.valueOf("altazLinesVisible"));
  }
});
// This component creates the boundaries and names of the contstellations
// It is only initialised once needed to reduce startup times
let bConstellBoundaries = new BabyLife.BabyEntity(bScene,bSky);
bConstellBoundaries.dependsOn(["showConstellBoundaries"]);
bConstellBoundaries.setInit((me,bScene)=>{
    me.mesh = new BABYLON.TransformNode("constellBoundaries");
    me.mesh.setParent(bSky.mesh);
    me.mesh.setEnabled(false);
    Object.keys(Constellations.constellations).forEach(k=>{
      let c = Constellations.constellations[k];
      Arcs.arcThrough(c.boundaryPoints,starDistance / 2,k + "Boundary",new BABYLON.Color3(0.05,0.1,0.05),me.mesh,bScene.scene);
    });
});
bConstellBoundaries.setUpdate(async (me,bScene)=>{
  if (me.mesh) me.mesh.setEnabled(bScene.valueOf("showConstellBoundaries"));
});

let bConstellNames = new BabyLife.BabyEntity(bScene,bSky);
bConstellNames.dependsOn(["showConstellBoundaries","showConstellLines"]);
bConstellNames.setInit((me,bScene)=>{
    me.mesh = new BABYLON.TransformNode("constellNames");
    me.mesh.setParent(bSky.mesh);
    me.mesh.setEnabled(false);
    Object.keys(Constellations.constellations).forEach(k=>{
      let c = Constellations.constellations[k];
      let t = Arcs.createTextAtRaDec(c.coords[0],c.coords[1],1000,k,"#601010",bScene.scene) ;
      t.setParent(me.mesh);
    });
});
bConstellNames.setUpdate(async (me,bScene)=>{
  let bounds = bScene.valueOf("showConstellBoundaries");
  let lines = bScene.valueOf("showConstellLines");
    if (me.mesh) me.mesh.setEnabled(bounds || lines);
});

// This component draws the lines to make the shapes of the constellations
let bConstellLines = new BabyLife.BabyEntity(bScene,bSky);
bConstellLines.dependsOn(["showConstellLines"]);
bConstellLines.setInit((me,bScene)=>{
  me.mesh = new BABYLON.TransformNode("constellLines");
  me.mesh.setParent(bSky.mesh);
  me.mesh.setEnabled(false);
  Object.keys(Constellations.constellations).forEach(k=>{
    let c = Constellations.constellations[k];
    Arcs.arcSystemThrough(c.lines,starDistance * 0.7,k+"Lines",new BABYLON.Color3(0.1,0.05,0.05),me.mesh,bScene.scene);
  });

});
bConstellLines.setUpdate((me,bScene)=>{
    if (me.mesh) me.mesh.setEnabled(bScene.valueOf("showConstellLines"));
});

// This component renders every star we know about
// Note that we actually create points even for very faint ones - our custom shader decides which ones
// are actually visible
let bStars = new BabyLife.BabyEntity(bScene,bSky);
bStars.dependsOn(["daylightVisible","programTime","brighten","minMag","maxMag","starPointSize"]);
bStars.setInit((me,bScene)=>{
  me.mesh = Stars.createStars(scene,starDistance);
  me.mesh.setParent(bStars.parent.mesh);
  Stars.alterStars(me.mesh,bScene.currentState(),false);
});
bStars.setUpdate((me,bScene)=>{
  let isDaylight = false;
  if (bScene.valueOf("daylightVisible")) {
     let sun = solarSystemResult.Sol;
     if (sun.values.coords.y > 100) {
       isDaylight = true;
     }
  }
  Stars.alterStars(me.mesh,bScene.changedState(),isDaylight);
});

// The sun is not just a small disk, but also a source of light. However, because large distances cause rounding issues, and everything has to be scaled back, we don't
// actually light the planets from the sun, just  the rest of the scene. So each planet excludes this light source
let bSun = new BabyLife.BabyEntity(bScene,bSky);
bSun.dependsOn(["daylightVisible","auScaling","programTime","latitude","longitude","brighten","minMag","maxMag","planetMult","starPointSize","sunAt"]);
bSun.setInit((me,bScene)=>{
  let sun = solarSystemResult.Sol;
  me.mesh = BABYLON.MeshBuilder.CreateSphere("Sun",{diameter: sun.values.scaledRadius*2},scene);
  me.mesh.setParent(me.parent.mesh);
  me.mesh.position.x = sun.values.npcoords.x;
  me.mesh.position.y = sun.values.npcoords.y;
  me.mesh.position.z = -sun.values.npcoords.z;
  me.mesh.material = new BABYLON.StandardMaterial("sunMaterial",bScene.scene);
  me.mesh.material.emissiveColor=new BABYLON.Color3(1,1,1);
  me.data.light = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene);
  me.data.light.fallofType = BABYLON.Light.FALLOFF_STANDARD;
  me.data.skyboxMaterial = new (BABYLON as any).SkyMaterial("skyMaterial",bScene.scene);
  me.data.skyboxMaterial.alphaMode = BABYLON.Engine.ALPHA_MAXIMIZED;
  me.data.skyboxMaterial.alpha = 0.9999; // so AlphaMode does something
  me.data.skyboxMaterial.backFaceCulling=false;
  me.data.skyboxMaterial.luminance = 0.1;
  me.data.skybox = BABYLON.Mesh.CreateBox("skyBox",500,bScene.scene);
  me.data.skybox.material = me.data.skyboxMaterial
});
bSun.setUpdate((me,bScene)=>{
  let sun = solarSystemResult.Sol;
  if (bScene.hasChanged("auScaling")) {
    me.mesh.dispose();
    me.mesh = BABYLON.MeshBuilder.CreateSphere("Sun",{diameter: sun.values.scaledRadius*2},scene);
  }
  me.mesh.position.x = sun.values.npcoords.x;
  me.mesh.position.y = sun.values.npcoords.y;
  me.mesh.position.z = -sun.values.npcoords.z;
  me.data.light.position.x = sun.values.coords.x;
  me.data.light.position.y = sun.values.coords.y;
  me.data.light.position.z = -sun.values.coords.z;
  if (me.data.light.position.y > -200 && bScene.valueOf("daylightVisible")) {
    me.data.skybox.setEnabled(true);
    me.data.light.setEnabled(true);  
    me.data.skybox.material.useSunPosition = true;
    me.data.skybox.material.sunPosition = new BABYLON.Vector3(sun.values.coords.x,sun.values.coords.y,-sun.values.coords.z);
  } else {
    me.data.skybox.setEnabled(false);
    me.data.light.setEnabled(false);  
  }
});
// This function allows us to create a component for other solar system objects since the logic is more or less the same for all of them
// Note that these are the objects when magnified to the point at which one can see the disk. For normal skies, the planets are rendered as points.
// name capitalised Moon, Saturn etc.
// fudgeFactor allows the moon to be further away relatively than planets to scale, otherwise it's far too close
let createPlanet = function(name:string,fudgeFactor:number,multOnAt:number,multMax:number,rotateAtTime0:number,intensity:number){
  async function loadSaturn(me:BabyLife.BabyEntity,bScene:BabyLife.BabyScene)   {
    /*
    let meshesSoFar = bScene.scene.meshes;
    console.log("Load saturn starts");
    let result=
      await BABYLON.SceneLoader.LoadAsync("models/","saturn2.obj",bScene.scene);
    me.mesh = result.getMeshByID("saturn2");
    me.mesh.setParent(me.parent.mesh);
    let totMeshesNow = result.meshes;
    for (let i = meshesSoFar;i< totMeshesNow;i++)
    {
      let m = result.meshes[i];
      if ( m !== me.mesh) {
        console.log(m.parent);
        m.setParent(me.mesh);
      }
    }
    me.data.factor = fudgeFactor / 200;
    */
    (BABYLON as any).OBJFileLoader.MATERIA_LOADING_FAILS_SILENTLY = false;
    let result=
      await BABYLON.SceneLoader.ImportMeshAsync("","models/","saturn2.obj",bScene.scene);
    me.mesh = result.meshes[0];
    me.mesh.setParent(me.parent.mesh);
    let firstmesh = me.mesh
    result.meshes.forEach( (m)=> {
      if (m !== firstmesh) {
         m.setParent(firstmesh);
      }
    });
    me.data.factor = fudgeFactor / 2;
    result.meshes.forEach( m=>{
      console.log(m.name,m);
    });
    me.data.update(me,bScene);
  }
  let bPlanet = new BabyLife.BabyEntity(bScene,bSky);
  if (!rotateAtTime0) {
    rotateAtTime0  = 0;
  }
  bPlanet.dependsOn(["auScaling","programTime","latitude","longitude","brighten","minMag","maxMag","planetMult","starPointSize","sunAt"]);
  bPlanet.setInit((me,bScene)=>{
    let sun = solarSystemResult.Sol;
    let planet = solarSystemResult[name];
    let planetScaling = bScene.valueOf("planetMult");
    if ( planetScaling > multMax) { planetScaling = multMax; };
    if (name === "SaturnModel") {
      loadSaturn(me,bScene);
    } else {
    let standardDiameter = 100; // We create the planet with a standard size of 100 and then scale it appropriately
    me.data.auScaling = bScene.valueOf("auScaling");
    me.data.factor = fudgeFactor * planet.values.scaledRadius*2 / standardDiameter ;
    me.mesh = BABYLON.MeshBuilder.CreateSphere(name,{diameter: standardDiameter},scene);
  
    me.mesh.setParent(me.parent.mesh);
    me.mesh.material = new BABYLON.StandardMaterial(name+"Material",bScene.scene);
    me.mesh.material.diffuseTexture = new BABYLON.Texture("textures/" + name + ".jpg",bScene.scene);
    bSun.data.light.excludedMeshes.push(me.mesh);
    let bumpTextureTask = assetsManager.addTextureTask(name+"bumpload","textures/" + name + "Normal" + ".jpg");
    //let bumpTexture =  new BABYLON.Texture("textures/" + name + "Normal" + ".jpg");
    bumpTextureTask.onSuccess = function(task) {
      console.log("Bump texture loaded OK for ", name);
      me.mesh.material.bumpTexture = task.texture;
    }
    me.mesh.material.specularColor = new BABYLON.Color3(0,0,0);
    me.mesh.material.roughness = 1;
    me.mesh.material.metallic = 0;
    me.mesh.material.useLogarithmicDepth = useLogarithmic;
    me.data.light = new BABYLON.DirectionalLight(name+"sunlight", new BABYLON.Vector3(sun.values.coords.x,sun.values.coords.y,-sun.values.coords.z), scene);
    me.data.light.includedOnlyMeshes.push(me.mesh);
    me.data.light.intensity = intensity;
    // me.data.light.fallofType = BABYLON.Light.FALLOFF_STANDARD;
    }
    if ( name === "Saturn") {
      me.data.rings = SaturnRings.createRings(bScene.scene,fudgeFactor*planet.body.radius*5,useLogarithmic);
      me.data.light.includedOnlyMeshes.push(me.data.rings); me.data.rings.setParent(me.mesh);
      me.data.rings.position.x = 0;
      me.data.rings.position.y = 0;
      me.data.rings.position.z = 0;
      me.data.rings.scaling.x = 80.0;
      me.data.rings.scaling.y = 80.0;
      me.data.rings.scaling.z = 80.0;
    }
  });
  bPlanet.setUpdate((me,bScene)=>{
    if (!me.mesh) {
      console.log("Mesh not yet loaded - waiting");
      return;
    }
    let sun = solarSystemResult.Sol;
    let planet = solarSystemResult[name];
    let planetScaling = bScene.valueOf("planetMult");
    let auScalingFactor = bScene.valueOf("auScaling") / me.data.auScaling;
    if ( planetScaling > multMax) { planetScaling = multMax; };
    me.mesh.setEnabled(planetScaling >= multOnAt)
    me.data.scaleFactor = auScalingFactor*planetScaling*me.data.factor;
    me.mesh.scaling = new BABYLON.Vector3(me.data.scaleFactor,me.data.scaleFactor,me.data.scaleFactor);
    me.mesh.position.x = fudgeFactor*planet.values.npcoords.x;
    me.mesh.position.y = fudgeFactor*planet.values.npcoords.y;
    me.mesh.position.z = fudgeFactor* -planet.values.npcoords.z;
    me.data.light.direction.x = -sun.values.coords.x+planet.values.coords.x;
    me.data.light.direction.y = -sun.values.coords.y+planet.values.coords.y;
    me.data.light.direction.z = sun.values.coords.z-planet.values.coords.z;

    let raRotate = -planet.body.axis.ra
    let decRotate = planet.body.axis.dec - 90.0;
    let planetRotate = rotateAtTime0 + (planet.body.rotateDaily / (24*3600*1000)) * bScene.valueOf("programTime");
    let rotInvert = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z,180/DegsPerRad);
    let rotP = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,planetRotate/DegsPerRad);
    let rotX = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X,decRotate/DegsPerRad);
    let rotY = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y,raRotate/DegsPerRad);
      // for world axes start at the back. Rotate by X(dec) then Y(ra)
    me.mesh.rotationQuaternion = rotY.multiply(rotX).multiply(rotInvert).multiply(rotP);
});
};
// Now we actuall create the planet components
createPlanet("Mercury",1,5,1000,0,1);
createPlanet("Venus",1,5,1000,0,1);
createPlanet("Mars",1,5,1000,0,1);
createPlanet("Jupiter",1,5,1000,0,1);
createPlanet("Saturn",1,5,1000,0,1);
createPlanet("Uranus",1,5,1000,0,1);
createPlanet("Neptune",1,5,1000,0,1);
createPlanet("Luna",moonFudge,0.1,10,10,6);

// This is the rendering of planets as point objects
let bPlanets = new BabyLife.BabyEntity(bScene,bSky);
bPlanets.dependsOn(["programTime","brighten","minMag","maxMag","planetMult","starPointSize","sunAt"]);
bPlanets.setInit((me,bScene)=>{
  me.mesh = Stars.createPlanets(scene,solarSystemResult);
  me.mesh.setParent(me.parent.mesh);
  Stars.alterPlanets(me.mesh,bScene.currentState(),false);
});
bPlanets.setUpdate((me,bScene)=>{
  let planetScaling = bScene.valueOf("planetMult");
  Stars.alterPlanets(me.mesh,bScene.changedState(),false);
  Stars.updatePlanets(me.mesh,solarSystemResult);
  me.mesh.setEnabled(planetScaling < 100);
});

let bKeyboard = new BabyLife.BabyEntity(bScene);
bKeyboard.dependsOn(["labelsVisible"]);
bKeyboard.setInit((me,bScene) => {
  let plane  = BABYLON.MeshBuilder.CreatePlane("keyboardplane",{width:1,height:1});
  let scaling = 40; // factor to make everything a reasonable size
  plane.scaling = new BABYLON.Vector3(scaling,scaling,scaling);
  let adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
  plane.position.x = 0;
  plane.position.y = 1.6 + (( 105/500 -0.5)* scaling)
  plane.position.z = 50;
  var grid = new BABYLON.GUI.Grid();   
  grid.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  grid.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  grid.addColumnDefinition(0.2);
  grid.addColumnDefinition(0.2);
  grid.addColumnDefinition(0.2);
  grid.addColumnDefinition(0.2);
  grid.addColumnDefinition(0.2);
  grid.addRowDefinition(50,true);

  let button = BABYLON.GUI.Button.CreateSimpleButton("help1","Help");
  //button1.width = 0.5;
  //button1.height= 0.2;
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.color = "yellow";
  button.background = "black";
  button.fontSize = 30;
  button.isPointerBlocker = true;
  button.onPointerClickObservable.add(()=>{
    interactionHandler.keyBindings("h");
  });
  grid.addControl(button,0,0);
  
  button = BABYLON.GUI.Button.CreateSimpleButton("help2","Constel Lines");
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.color = "white";
  button.background = "black";
  button.fontSize = 25;
  button.isPointerBlocker = true;
  button.onPointerClickObservable.add(()=>{
    toggleConstellLinesAction();
  });
  grid.addControl(button,0,1);

  button = BABYLON.GUI.Button.CreateSimpleButton("help2","Constel Bounds");
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.color = "white";
  button.background = "black";
  button.fontSize = 25;
  button.isPointerBlocker = true;
  button.onPointerClickObservable.add(()=>{
    toggleConstellBoundariesAction();
  });
  grid.addControl(button,0,2);
  
  button = BABYLON.GUI.Button.CreateSimpleButton("help2","Alt/Az lines");
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.color = "white";
  button.background = "black";
  button.fontSize = 25;
  button.isPointerBlocker = true;
  button.onPointerClickObservable.add(()=>{
    toggleAltazLinesAction();
  });
  grid.addControl(button,0,3);

  button = BABYLON.GUI.Button.CreateSimpleButton("help2","Ra/Dec Lines");
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  button.color = "white";
  button.background = "black";
  button.fontSize = 25;
  button.isPointerBlocker = true;
  button.onPointerClickObservable.add(()=>{
    toggleRadecLinesAction();
  });
  grid.addControl(button,0,4);

  adt.addControl(grid);

  var grid2 = new BABYLON.GUI.Grid();
  grid2.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  grid.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  grid2.top = 55;
  grid2.addRowDefinition(50,true);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.1);
  grid2.addColumnDefinition(0.05);
  grid2.addColumnDefinition(0.05);


  for (let i=1;i<=9;i++)
  {
    let speedButton = BABYLON.GUI.Button.CreateSimpleButton("s" + i.toString(),programTime.timeIncrementTexts[i]);
    speedButton.fontSize = 30;
    speedButton.isPointerBlocker = true;
    speedButton.color = "white";
    speedButton.onPointerClickObservable.add(()=>{
      interactionHandler.keyBindings(i.toString());
    });
    grid2.addControl(speedButton,0,i-1);
  }
  button = BABYLON.GUI.Button.CreateSimpleButton("tplus","T+");
  button.fontSize = 30;
  button.isPointerBlocker = true;
  button.color = "white";
  button.onPointerClickObservable.add(()=>{
    interactionHandler.keyBindings('u');
  });
  grid2.addControl(button,0,9);

  button = BABYLON.GUI.Button.CreateSimpleButton("tminus","T-");
  button.fontSize = 30;
  button.isPointerBlocker = true;
  button.color = "white";
  button.onPointerClickObservable.add(()=>{
    interactionHandler.keyBindings('U');
  });
  grid2.addControl(button,0,10);
  adt.addControl(grid2);
  let showLabels = bScene.valueOf("labelsVisible");
  plane.setEnabled(showLabels);
  me.data.plane = plane;
});
bKeyboard.setUpdate((me,bScene)=>{
  let showLabels = bScene.valueOf("labelsVisible");
  me.data.plane.setEnabled(showLabels);
});
// create a text box which, if placed at 'distance' will show the text at a standard size scaled by the appropriate factor
const textBox = function(text:string,nRows:number,nCols:number,scaleBy:number,distance:number) {
  const ratio = 40/19; // for our standard font this just happens to be about right
  const fontFactor = 1800; 
  let plane = BABYLON.MeshBuilder.CreatePlane("textplane",{width:1,height:1},bScene.scene);
  const widthNeeded = nCols;
  const heightNeeded = nRows* ratio;
  const sizeNeeded = Math.max(widthNeeded,heightNeeded);
  const fontSize = fontFactor / sizeNeeded;
  const scaling = distance * scaleBy * 25 / fontSize;
  plane.scaling = new BABYLON.Vector3(scaling,scaling,scaling);
  let adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(plane);
  adt.background = "black";
  let button = BABYLON.GUI.Button.CreateSimpleButton("textx",text);
  button.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  button.width = widthNeeded/sizeNeeded;
  button.height= heightNeeded/sizeNeeded;
  button.fontSize=fontSize;
  button.color = "white";
  button.isPointerBlocker = true;
  adt.addControl(button);
  return({plane:plane,adt:adt,button:button,scaling:scaling,buttonHeight:heightNeeded/sizeNeeded});
}

const bHelp = new BabyLife.BabyEntity(bScene);
bHelp.dependsOn(["helpVisible"]);
bHelp.setInit((me,bScene) =>{

  const helpText=`Help - click to dismiss this message
  You can control the planetarium with the buttons or by using the two hand controllers. 
  Key bindings, along with other useful information, are shown by the controller images. 
  If you click in the sky, the right controller will show you detailed information about the nearest object to where you clicked.

  Note that we don't have info or displays of deep sky objects. 
  For the moment this is a tool for learning the constellations and the movement of the planets.
  `;
  const distance = 30;
  const c = textBox(helpText,13,50,1,distance);

  let plane = c.plane;
  let adt = c.adt;
  let button = c.button;
  // plane.isPickable = true;
 
  plane.position.y = 1.6 + ((-0.5 + c.buttonHeight)* c.scaling) ;
  plane.position.z = distance;
  button.onPointerClickObservable.add(()=>{
     bScene.changeState({"helpVisible":false});
  });
  adt.addControl(button);
  me.data.plane = plane;
  return;
});

bHelp.setUpdate((me,bScene)=>{
  const showHelp = bScene.valueOf("helpVisible");
  me.data.plane.setEnabled(showHelp);
  me.data.plane.isVisible = showHelp;
});

/* We no longer show labels in the sky, but this is useful for future reference
let bLabels = new BabyLife.BabyEntity(bScene);
bLabels.dependsOn(["labelsVisible","programTime","eastText"]);
bLabels.setInit((me,bScene) =>{
const planeDist = 500;
var northPlane = me.data.northPlane = BABYLON.Mesh.CreatePlane("plane", planeDist,bScene.scene);
let northAdt = me.data.northAdt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(northPlane);
northPlane.position.y = 4;
northPlane.position.z = planeDist;
let northText = me.data.northText = new BABYLON.GUI.TextBlock();
northText.color = "red";
northText.fontSize = 24;
northText.text="N";
northAdt.addControl(northText);
var eastPlane = me.data.eastPlane = BABYLON.Mesh.CreatePlane("plane", planeDist,bScene.scene);
let eastAdt = me.data.eastAdt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(eastPlane);
eastPlane.position.y = 4;
eastPlane.position.x = planeDist;
eastPlane.rotation.y = 90 / DegsPerRad;
var eastText = me.data.eastText = new BABYLON.GUI.TextBlock();
eastText.text= bScene.valueOf("eastText");
eastText.color = "red";
eastText.fontSize = 24;
eastAdt.addControl(eastText);
var southPlane = me.data.southPlane = BABYLON.Mesh.CreatePlane("plane", planeDist,bScene.scene);
let southAdt = me.data.southAdt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(southPlane);
southPlane.position.y = 4;
southPlane.position.z = -planeDist;
southPlane.rotation.y = 180 / DegsPerRad;
var southText = me.data.southText = new BABYLON.GUI.TextBlock();
southText.text="S";
southText.color = "red";
southText.fontSize = 24;
southAdt.addControl(southText);
var westPlane = me.data.westPlane = BABYLON.Mesh.CreatePlane("plane", planeDist,bScene.scene);
let westAdt = me.data.westAdt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(westPlane);
westPlane.position.y = 4;
westPlane.position.x  = -planeDist;
westPlane.rotation.y = -90 / DegsPerRad;
var westText = me.data.westText = new BABYLON.GUI.TextBlock();
westText.text="W";
westText.color = "red";
westText.fontSize = 24;
westAdt.addControl(westText);
});

bLabels.setUpdate((me,bScene)=>{
  let showLabels = bScene.valueOf("labelsVisible");
  me.data.westPlane.setEnabled(showLabels);
  me.data.northPlane.setEnabled(showLabels);
  me.data.eastPlane.setEnabled(showLabels);
  me.data.southPlane.setEnabled(showLabels);
  let options={hour:"numeric",minute:"numeric",second:"numeric"};
  me.data.northText.text = programTime.getCurrentProgramTimeAsDate().toLocaleDateString("EN-GB",options);
  me.data.eastText.text= bScene.valueOf("eastText");
});
*/

// Our floor uses an example texture from the babylon website. This should be changed to one of our own in due course
let bFloor = new BabyLife.BabyEntity(bScene);
bFloor.dependsOn(["floorVisible"]);
bFloor.setInit((me,bScene) =>{
  let terrainTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/earth.jpg",bScene.scene);
  let terrainMaterial = new BABYLON.StandardMaterial("floor",bScene.scene);
  terrainMaterial.diffuseTexture = terrainTexture;
  var createTerrain = function(mapData:any,mapSubX:any,mapSubZ:any) {
    me.data.terrain = new (BABYLON as any).DynamicTerrain('t', {
      mapData:mapData,
      mapSubX:mapSubX,
      mapSubZ:mapSubZ,
      terrainSub:120
    },bScene.scene);
    me.data.terrain.createUVMap();
    me.data.terrain.mesh.material = terrainMaterial;
    me.data.terrain.update(true);
  }
  var hmURL = "https://www.babylonjs-playground.com/textures/worldHeightMap.jpg";
  var mapWidth = 1000;
  var mapHeight = 1000;
  var nbPoints = 500;
  var hmOptions = {
    width:mapWidth,height:mapHeight,subX:nbPoints,subZ:nbPoints,
    onReady:createTerrain,
    offsetX:0,offsetZ:-250,
  };
  var mapData = new Float32Array(nbPoints*nbPoints*3);
  (BABYLON as any).DynamicTerrain.CreateMapFromHeightMapToRef(hmURL,hmOptions,mapData,bScene.scene);
});
bFloor.setUpdate((me,bScene) =>{
  let showFloor = bScene.valueOf("floorVisible");
  if (me.data.terrain) {
    me.data.terrain.mesh.isVisible = showFloor;
  }
});

// At this point we have successfully created our scene. Now we need some code to wire up the controllers
// This code should, ideally, be the only thing which needs to change if we want to change our interface for different hardware
//

const timeForwardAction = 
      ()=> {
          programTime.applyTimeIncrementForward();
          updateProgramTime(true);
      };

const timeBackAction =
      ()=> {
          programTime.applyTimeIncrementBackward();
          updateProgramTime(true);
      };
const toggleActionFor = (name:string)=> {
  let v = () => {
    let w:any = {};
      w[name] = !bScene.valueOf(name);
      bScene.changeState(w);
  }
  return v;
};
const toggleLabelsAction = toggleActionFor("labelsVisible");
const toggleConstellLinesAction = toggleActionFor("showConstellLines");
const toggleConstellBoundariesAction = toggleActionFor("showConstellBoundaries");
const toggleAltazLinesAction = toggleActionFor("altazLinesVisible");
const toggleRadecLinesAction = toggleActionFor("radecLinesVisible");
const changeFloorAndDaylightVisibilityAction = 
      ()=> {
          let fv = bScene.valueOf("floorVisible");
          let dv = bScene.valueOf("daylightVisible");
          if ( fv && dv ) {
            fv = false;dv=false;
          } else if (fv) {
            fv = true;dv=true;
          } else  {
            fv = true;dv=false;
          }
          bScene.changeState({floorVisible:fv});
          bScene.changeState({daylightVisible:dv});
      };
const latitudeAdjust = (level:number)=> {
  let lat = bScene.valueOf("latitude");
  lat = lat + level;
  if ( lat > 90 ) { lat = 90; }
  else if ( lat < -90 ) { lat = -90; }
  bScene.changeState({latitude:lat});
}
const longitudeAdjust = (level:number)=> {
  let lon = bScene.valueOf("longitude");
  lon = lon + level;
  if ( lon > 360 ) { lon = lon - 360; }
  else if ( lon < 0 ) { lon = lon + 360; }
  bScene.changeState({longitude:lon});
}
const starMagnitudeAdjust = (level:number)=> {
   bScene.changeState({maxMag:bScene.valueOf("maxMag")+level/10.0});
}
const planetSizeAdjust = (level:number)=> {
   let pMult = bScene.valueOf("planetMult");
   pMult = pMult * Math.pow(1.2,level);
   if (pMult < 1) { pMult = 1;} else if (pMult > 1000) {pMult = 1000;}
   bScene.changeState({planetMult:pMult});
}
const timeIncrementAdjust = (level:number)=> {
  programTime.fasterIncrement();
  bScene.changeState({currentTimeIncrement:programTime.timeIncrement()});
}
class InteractionHandler {
    buttonStartDelay = 400;
    buttonRepeatDelay = 100;
    labelMap:any = {a:0,b:1,x:2,y:3};
    leftControllerTextBlock:any = null;
    rightControllerTextBlock:any = null;
    buttonStatus:any = [
      {label:"a",lastPressed:null,lastActioned:null,action:null,helpText:"unassigned"},
      {label:"b",lastPressed:null,lastActioned:null,action:null,helpText:"unassigned"},
      {label:"x",lastPressed:null,lastActioned:null,action:null,helpText:"unassigned"},
      {label:"y",lastPressed:null,lastActioned:null,action:null,helpText:"unassigned"},
    ];
    leftPadUpDownAction:any = () =>{};
    leftPadUpDownHelpText = "unassigned";
    leftPadLeftRightAction:any = () =>{};
    leftPadLeftRightHelpText = "unassigned";
    rightPadUpDownAction:any = () =>{};
    rightPadUpDownHelpText = "unassigned";
    rightPadLeftRightAction:any = () =>{};
    rightPadLeftRightHelpText = "unassigned";
    leftSecondaryTriggerAction:any = () =>{};
    leftSecondaryTriggerHelpText = "unassigned";
    rightSecondaryTriggerAction:any = () =>{};
    rightSecondaryTriggerHelpText = "unassigned";
    leftController:any;
    rightController:any;
    leftControllerHelp:any;
    rightControllerHelp:any;
    constructor() {
    }
  getButtonHelpText(c:string) {
    return this.buttonStatus[this.labelMap[c]].helpText;
  }
  setButtonAction(c:string,f:any,text:string) {
    let l = this.buttonStatus[this.labelMap[c]];
    l.action = f;
    l.helpText = text;
  }
  setLeftPadUpDownAction(f:any,text:string) {
    this.leftPadUpDownAction = f;
    this.leftPadUpDownHelpText = text;
  }
  setRightPadUpDownAction(f:any,text:string) {
    this.rightPadUpDownAction = f;
    this.rightPadUpDownHelpText = text;
  }
  setLeftPadLeftRightAction(f:any,text:string) {
    this.leftPadLeftRightAction = f;
    this.leftPadLeftRightHelpText = text;
  }
  setRightPadLeftRightAction(f:any,text:string) {
    this.rightPadLeftRightAction = f;
    this.rightPadLeftRightHelpText = text;
  }
  setLeftSecondaryTriggerAction(f:any,text:string) {
    this.leftSecondaryTriggerAction = f;
    this.leftSecondaryTriggerHelpText = text;
  }
  setRightSecondaryTriggerAction(f:any,text:string) {
    this.rightSecondaryTriggerAction = f;
    this.rightSecondaryTriggerHelpText = text;
  }
  notifyRepeatableButton(c:string,b:any) {
    let theButton = this.buttonStatus[this.labelMap[c]];
    let d = new Date().getTime();
    if (b.pressed) {
      // just pressed the button
      theButton.lastPressed = d;
      theButton.lastActioned = d;
      if (theButton.action) {
        theButton.action();
      }
    } else {
      // button no longer pressed
      theButton.lastPressed = null;
    }
  }

  handleAutoRepeat() {
    let d = new Date().getTime();
    this.buttonStatus.forEach( (theButton:any) =>{
      if (theButton.lastPressed ) {
         if ( (d - theButton.lastPressed) >= this.buttonStartDelay) {
            if ( (!theButton.lastActioned ) || (
                 (d - theButton.lastActioned) > this.buttonRepeatDelay)) {

              theButton.lastActioned = d;
              theButton.action();
            }
         }
      }
    });
  }
  updateControllerText() {
    if (this.leftControllerTextBlock) {

    let options={hour:"numeric",minute:"numeric",second:"numeric"};
    this.leftControllerTextBlock.text = programTime.getCurrentProgramTimeAsDate().toLocaleDateString("EN-GB",options)+"\n"+
      "Time increment: " + programTime.timeIncrementText() + "\n" + 
      "Y " + this.getButtonHelpText('y') + "\n" + 
      "X " + this.getButtonHelpText('x') + "\n" + 
      "U/D " + this.leftPadUpDownHelpText + "\n" + 
      "L/R " + this.leftPadLeftRightHelpText + "\n" + 
      "Side " + this.leftSecondaryTriggerHelpText;
    }
    if (this.rightControllerTextBlock) {
       this.rightControllerTextBlock.text=selectedStarText+"\n" + 
      "B " + this.getButtonHelpText('b') + "\n" + 
      "A " + this.getButtonHelpText('a') + "\n" + 
      "U/D " + this.rightPadUpDownHelpText + "\n" + 
      "L/R " + this.rightPadLeftRightHelpText + "\n" + 
      "Side " + this.rightSecondaryTriggerHelpText;
    }
  }
  useController(webVRController:any) {
    if (webVRController.hand === "left") {
     this.leftController = webVRController;
     let me:any = this.leftControllerHelp = {data:{}};
     me.data.plane = BABYLON.Mesh.CreatePlane("leftControllerHelp",0.8,bScene.scene);
     me.data.plane.isPickable = false;
     me.data.adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(me.data.plane);
     me.data.plane.setParent(webVRController.mesh);
     me.data.plane.position.x = 0.03;
     me.data.plane.position.y = 0.06;
     me.data.plane.position.z = -0.07;
     me.data.plane.rotation.x=0;
     me.data.plane.rotation.y=0;
     me.data.plane.rotation.z=0;
     me.data.plane.addRotation(0,180/DegsPerRad,0);
     me.data.plane.addRotation(45/DegsPerRad,0,0);
     //me.plane.addRotation(45/DegsPerRad,0,0);
     //me.plane.addRotation(0,0,30/DegsPerRad);
     //me.data.adt.addControl(me.keyboard);

     let textblock = new BABYLON.GUI.TextBlock();
     textblock.color = "#709070";
     textblock.fontSize = 10;
     textblock.text="Y +Time\nX -Time\nU/D Lat\nL/R Long";

     me.data.adt.addControl(textblock);
     this.leftControllerTextBlock = textblock;

    // Button X
    webVRController.onXButtonStateChangedObservable.add(
      (stateObject:any)=>interactionHandler.notifyRepeatableButton('x',stateObject)
    );
    // Button Y
    webVRController.onYButtonStateChangedObservable.add(
      (stateObject:any)=>interactionHandler.notifyRepeatableButton('y',stateObject)
    );
    webVRController.onPadStateChangedObservable.add(
      (stateObject:any)=> {
          if (!stateObject.pressed) return;
      }
    );
    // Left pad controls latitude and longitude
    webVRController.onPadValuesChangedObservable.add(
      (stateObject:any)=> {
          if (Math.abs(stateObject.y) > Math.abs(stateObject.x)) {
            this.leftPadUpDownAction(stateObject.y);
          }
          else {
            this.leftPadLeftRightAction(stateObject.x);
          }
      }
    );
    // set up raycasting if not already working // this is a bug workaround
    webVRController.onTriggerStateChangedObservable.add(
      (stateObject:any)=> {
	      return;
          if (!stateObject.pressed) return;
          if ((VRHelper as any)._rightController) {
             (VRHelper as any)._rightController._deactivatePointer();
          }
	  VRHelper.setLaserColor(new BABYLON.Color3(0.5,0.1,0.1),new BABYLON.Color3(0.5,0.5,0.1));
	  VRHelper.setGazeColor(new BABYLON.Color3(0.5,0.1,0.1),new BABYLON.Color3(0.5,0.5,0.1));
          (VRHelper as any)._leftController._activatePointer();
          //VRHelper._leftController._setLaserPointerColor(new BABYLON.Color3(0.5,0.1,0.1));
          //VRHelper.displayLaserPointer = true;
      }
    );
    // Index finger trigger changes the time increment
    webVRController.onSecondaryTriggerStateChangedObservable.add(
      (stateObject:any)=> {
          if (!stateObject.pressed) return;
          if (stateObject.value < 0.99) return;
          this.leftSecondaryTriggerAction();
      }
    );
    webVRController.onThumbRestChangedObservable.add(
      (stateObject:any)=> {
          if (!stateObject.pressed) return;
      }
    );
   } else { // right controller
     this.rightController = webVRController;
     let me:any = this.rightControllerHelp = {data:{}};
     me.data.plane = BABYLON.Mesh.CreatePlane("rightControllerHelp",0.8,bScene.scene);
     me.data.plane.isPickable = false;
     me.data.adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(me.data.plane);
     me.data.plane.setParent(webVRController.mesh);
     me.data.plane.position.x = -0.03;
     me.data.plane.position.y = 0.05;
     me.data.plane.position.z = -0.07;
     me.data.plane.rotation.x=0;
     me.data.plane.rotation.y=0;
     me.data.plane.rotation.z=0;
     me.data.plane.addRotation(0,180/DegsPerRad,0);
     me.data.plane.addRotation(45/DegsPerRad,0,0);
     // me.data.plane.addRotation(90/DegsPerRad,0,0);
     // me.data.adt.addControl(me.keyboard);

     let textblock = new BABYLON.GUI.TextBlock();
     textblock.color = "#709070";
     textblock.fontSize = 10;
     textblock.text="What is \nGoing On\nHere";
     this.rightControllerTextBlock = textblock;

     me.data.adt.addControl(textblock);
    // Button A
    webVRController.onAButtonStateChangedObservable.add(
      (stateObject:any)=>interactionHandler.notifyRepeatableButton('a',stateObject)
    );
    // Button B
    webVRController.onBButtonStateChangedObservable.add(
      (stateObject:any)=>interactionHandler.notifyRepeatableButton('b',stateObject)
    );
    // Right controller trigger selects an object to display information about
    webVRController.onTriggerStateChangedObservable.add(
      (stateObject:any)=> {
          if (!stateObject.pressed) return;
	  if (false) {
          if ((VRHelper as any)._leftController) {
             (VRHelper as any)._leftController._deactivatePointer();
          }
	  VRHelper.setLaserColor(new BABYLON.Color3(0.5,0.1,0.1),new BABYLON.Color3(0.5,0.5,0.1));
          (VRHelper as any)._rightController._activatePointer();
	  }
          let vqr = webVRController.deviceRotationQuaternion.clone();
          let startVector = new BABYLON.Vector3(0,0,-1);
          let baseVector = startVector.rotateByQuaternionToRef(vqr,new BABYLON.Vector3(0,0,0));
          
          //pointsAt.position = baseVector.scale(1000);
          let nearby = Astro.nearestStar(
            bScene.valueOf("latitude"),
            bScene.valueOf("longitude"),
            baseVector.x,baseVector.y,-baseVector.z,programTime.getCurrentProgramTimeAsAstroTime(),
            bScene.valueOf("maxMag"));
          let nearbySolar = Astro.nearestSolarSystem(
            solarSystemResult,
            bScene.valueOf("latitude"),
            bScene.valueOf("longitude"),
            baseVector.x,baseVector.y,-baseVector.z,programTime.getCurrentProgramTimeAsAstroTime(),
            bScene.valueOf("maxMag"));
          if (nearbySolar.distance < nearby.distance) {
             bScene.changeState({"eastText": 
               (nearbySolar.name) + " " + "[" + nearbySolar.ra + " " + nearbySolar.dec + "] mag:" + nearbySolar.mag} );
             selectedStarText=
               (nearbySolar.name) + " " + "[" + nearbySolar.ra + " " + nearbySolar.dec + "] mag:" + nearbySolar.mag;
          } else {
             bScene.changeState({"eastText": 
               (nearby.proper||"") + " " + nearby.name + "[" + nearby.ra + " " + nearby.dec + "] mag:" + nearby.mag} );
             selectedStarText=
               (nearby.proper||"") + " " + nearby.name + "[" + nearby.ra + " " + nearby.dec + "] mag:" + nearby.mag ;
          }
      }
    );
    // Right controller pad has dynamic functions
    webVRController.onPadValuesChangedObservable.add(
      (stateObject:any)=> {
          if (Math.abs(stateObject.y) > Math.abs(stateObject.x)) {
            this.rightPadUpDownAction(stateObject.y);
          }
          else {
            this.rightPadLeftRightAction(stateObject.x);
          }
      }
    );
    // Index finger trigger changes the button assignments
    webVRController.onSecondaryTriggerStateChangedObservable.add(
      (stateObject:any)=> {
        if (!stateObject.pressed) return;
        if (stateObject.value < 0.99) return;
        this.rightSecondaryTriggerAction();
      }
    );
   }
  }
  // key bindings work when on a PC, and also using the virtual keyboard
  keyBindings(key:string){
  let pMult = bScene.valueOf("planetMult");
  switch(key) {
    case 'i':
       scene.debugLayer.show({});
       break;
    case 'f':
       bScene.changeState({floorVisible: !bScene.valueOf("floorVisible")});
       break;
    case 'd':
       bScene.changeState({daylightVisible: !bScene.valueOf("daylightVisible")});
       break;
    case 'l':
       toggleLabelsAction();
       break;
    case 'm':
       bScene.changeState({maxMag:bScene.valueOf("maxMag")+0.5});
       break;
    case 'M':
    case "Start/Stop\nClock":
       let currentSpeedIndex = programTime.currentSpeedIndex;
       if (currentSpeedIndex == 0) {
         programTime.setSpeedFromIncrement();
       } else {
         programTime.setSpeed(0);
       }
       break;
    case 'Show Fewer Stars':
       bScene.changeState({maxMag:bScene.valueOf("maxMag")-0.5});
       break;
    case 'p':
       if (pMult < 1000) {
         bScene.changeState({planetMult:pMult*1.2});
       }
       break
    case 'P':
       if (pMult > 1) {
         bScene.changeState({planetMult:pMult/1.2});
       }
       break;
    case 's':
      let auScaling = bScene.valueOf("auScaling") / Math.sqrt(1000);
      bScene.changeState({auScaling:auScaling});
      bScene.changeState({"eastText": 
          "AuScale: " + auScaling.toString()
               } );
      break
    case 'a':
      auScaling = bScene.valueOf("auScaling") * Math.sqrt(1000);
      bScene.changeState({auScaling:auScaling});
      bScene.changeState({"eastText": 
          "AuScale: " + auScaling.toString()
               } );
      break
    case 'Help':
    case 'h':
      bScene.changeState({helpVisible: !bScene.valueOf("helpVisible")})  
      break;
    case 'Dismiss Help':
    case 'Help -  Click here to dismiss':
      bScene.changeState({helpVisible:false});
    case 'c':
    case "Constellation\nLines":
       toggleConstellLinesAction();
       break;
    case 'v':
    case "Constellation\nBounds":
       toggleConstellBoundariesAction();
       break;
    case 'T':
       break;
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      programTime.setTimeIncrement(key.charCodeAt(0)-'0'.charCodeAt(0));
      bScene.changeState({currentTimeIncrement:programTime.timeIncrement()});
      break;
    case 'u':
       programTime.applyTimeIncrementForward();
       break;
    case 'U':
       programTime.applyTimeIncrementBackward();
       break;
  };
  updateProgramTime(true);
  bScene.update();
}
// This section deals with all our interactions 
}
// Now we can actually set things up
bScene.init();
interactionHandler = new InteractionHandler();
interactionHandler.setButtonAction('a',toggleConstellLinesAction,"Constellation lines");
interactionHandler.setButtonAction('b',changeFloorAndDaylightVisibilityAction,"Environment");
interactionHandler.setButtonAction('y',timeBackAction,"Time back");
interactionHandler.setButtonAction('x',timeForwardAction,"Time forward");
interactionHandler.setLeftPadUpDownAction(latitudeAdjust,"Latitude");
interactionHandler.setLeftPadLeftRightAction(longitudeAdjust,"Longitude");
interactionHandler.setLeftSecondaryTriggerAction(timeIncrementAdjust,"Change Time interval");
interactionHandler.setRightPadUpDownAction(starMagnitudeAdjust,"Star limits");
interactionHandler.setRightPadLeftRightAction(planetSizeAdjust,"Planet size");
interactionHandler.setRightSecondaryTriggerAction(toggleLabelsAction,"show/hide keyboard");


scene.onBeforeRenderObservable.add(()=>{
  interactionHandler.handleAutoRepeat();
  updateProgramTime();
  interactionHandler.updateControllerText();
  bScene.update();
  VRHelper.changeLaserColor(new BABYLON.Color3(0.5,0.1,0.1));
});

// Then we bind these functions to actions, either keyboard or pointer
scene.actionManager=new BABYLON.ActionManager(scene);
scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
  interactionHandler.keyBindings(evt.sourceEvent.key);
}));

// let pointsAt = BABYLON.MeshBuilder.CreateSphere("pointsAt",{diameter:10},bScene.scene);
//pointsAt.position.x = 0;
//pointsAt.position.y = 0;
//pointsAt.position.z = 1000;
VRHelper.onControllerMeshLoaded.add((webVRController)=> {
  interactionHandler.useController(webVRController);
});
return {scene:scene,engine:engine};
};

buildSkyScene(engine,scene);

scene.registerAfterRender( function setUpOnce() {
  scene.unregisterAfterRender(setUpOnce)
});

// Register a render loop to repeatedly render the scene
  engine.runRenderLoop(function () { 
        scene.render();
  });

// Watch for browser/canvas resize events
  window.addEventListener("resize", function () { 
        engine.resize();
  });
}