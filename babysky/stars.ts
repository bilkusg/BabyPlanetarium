import * as Astro from "../astro/astro.js";
BABYLON.Effect.ShadersStore["starVertexShader"] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;


attribute float starMagnitude;
attribute vec3 starColor;
varying vec3 vStarColor;
varying  float vStarMagnitude;
varying float calculatedSize;
uniform float starPointSize;
uniform float maxMag;
uniform float minMag;
uniform float brighten;

void main(void) {
  gl_Position= worldViewProjection * vec4(position,1.0);
  vUV = uv;

  vStarColor = starColor;
  vStarMagnitude = starMagnitude;
  float magDiff = minMag - starMagnitude;
  if ( magDiff <= 0.0) {
    gl_PointSize = calculatedSize = starPointSize; 
  } else {
    gl_PointSize = calculatedSize = ceil(starPointSize*pow(abs(brighten),magDiff));
  }
}
`;
BABYLON.Effect.ShadersStore["starFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform int isDaylight;
uniform float starPointSize;
uniform float maxMag;
uniform float minMag;
varying vec3 vStarColor;
varying float vStarMagnitude;
varying float calculatedSize;
float brightFactor = 1.0;

    void main() {
      if ( isDaylight == 1 ) {
	      discard;
      }
      if (vStarMagnitude > maxMag) {
        brightFactor = 0.0;
      } else if (vStarMagnitude > minMag) {
        brightFactor = 1.0 - (vStarMagnitude-minMag)/(maxMag-minMag);
      } else {
        brightFactor = 1.0;
      }
      gl_FragColor = vec4(brightFactor* vStarColor,1.0);
      if (calculatedSize >= 2.0) {
         vec2 xy = gl_PointCoord.xy - vec2(0.5);
         float ll = length(xy) * 1.4142135 * 3.1415926 / 2.0;
         if (ll < 0.4) {
           gl_FragColor = vec4(brightFactor* vStarColor,1.0);
         }
         else if (ll < 0.5) {
           gl_FragColor = vec4(brightFactor*0.8*vStarColor,1.0);
         } else {
           gl_FragColor = vec4(0.0,0.0,0.0, 1.0);
         }
      }
    } 
`;
const createStarShaderMaterial = function (name:string, scene:BABYLON.Scene) {
    var starShaderMaterial = new BABYLON.ShaderMaterial(name, scene, { vertex: "star", fragment: "star", }, {
        attributes: ["position", "normal", "uv", "starColor", "starMagnitude"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "starPointSize", "maxMag", "minMag", "brighten", "isDaylight"],
    });
    //var mainTexture = new BABYLON.Texture("textures/amiga.jpg",scene);
    //starShaderMaterial.setTexture("textureSampler",mainTexture);
    starShaderMaterial.backFaceCulling = false;
    starShaderMaterial.pointsCloud = true;
    starShaderMaterial.alphaMode = BABYLON.Engine.ALPHA_MAXIMIZED;
    starShaderMaterial.alpha = 0.9999;
    return starShaderMaterial;
};
// Functions to create the complex objects
const alterStars = function (starMesh:any, fields:any, isDaylight:boolean) {
    var starShaderMaterial = starMesh.material;
    if ("starPointSize" in fields) {
        starShaderMaterial.setFloat("starPointSize", fields.starPointSize);
    }
    if ("minMag" in fields) {
        starShaderMaterial.setFloat("minMag", fields.minMag);
    }
    if ("maxMag" in fields) {
        starShaderMaterial.setFloat("maxMag", fields.maxMag);
    }
    if ("brighten" in fields) {
        starShaderMaterial.setFloat("brighten", fields.brighten);
    }
    if (isDaylight) {
        starShaderMaterial.setInt("isDaylight", 1);
    }
    else {
        starShaderMaterial.setInt("isDaylight", 0);
    }
};
const createStars = function (scene:BABYLON.Scene, starDistance:number) {
    var positions = [];
    var colors = [];
    var starMagnitudes = [];
    for (var i = 0; i < Astro.nStars; i++) {
        let aStar = Astro.getStarData(i, 90, 0, null, starDistance, false, null);
        let x = aStar.npcoords.x;
        let y = aStar.npcoords.y;
        let z = -aStar.npcoords.z;
        positions.push(x, y, z);
        let r = aStar.color[0] / 255;
        let g = aStar.color[1] / 255;
        let b = aStar.color[2] / 255;
        colors.push(r, g, b, 1.0);
        starMagnitudes.push(Number(aStar.mag));
    }
    var starMesh = new BABYLON.Mesh("stars", scene);
    var starShaderMaterial = createStarShaderMaterial("starShader", scene);
    starMesh.material = starShaderMaterial;
    alterStars(starMesh, {
        starPointSize: 3.0,
        minMag: 0.0,
        maxMag: 5.0,
        brighten: 1.5849,
    }, false);
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.applyToMesh(starMesh, true);
    //starMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind,positions,true);
    starMesh.setVerticesData("starColor", colors, true, 4);
    starMesh.setVerticesData("starMagnitude", starMagnitudes, true, 1);
    return starMesh;
};
const createPlanets = function (scene:BABYLON.Scene,solarSystemResult:Astro.SolarSystemResult) {
    var planetMesh = new BABYLON.Mesh("planets", scene);
    var starShaderMaterial = createStarShaderMaterial("planetShader", scene);
    planetMesh.material = starShaderMaterial;
    alterPlanets(planetMesh, {
        starPointSize: 3.0,
        minMag: 0.0,
        maxMag: 5.0,
        brighten: 1.5849,
    },false);
    var positions:Array<number> = [];
    var colors:Array<number> = [];
    var starMagnitudes:Array<number> = [];
    Object.keys(solarSystemResult).forEach(
      (k)=>{
        let aPlanet = solarSystemResult[k];
        if (aPlanet.body.bf != "Luna" && aPlanet.body.bf != "Sol") {
          let x = aPlanet.values.npcoords.x;
          let y = aPlanet.values.npcoords.y;
          let z = -aPlanet.values.npcoords.z;
          positions.push(x, y, z);
          let r = aPlanet.body.color[0] / 255;
          let g = aPlanet.body.color[1] / 255;
          let b = aPlanet.body.color[2] / 255;
          colors.push(r, g, b);
          starMagnitudes.push(aPlanet.values.mag);
          }
      }
    );
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.applyToMesh(planetMesh, true);
    //starMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind,positions,true);
    planetMesh.setVerticesData("starColor", colors, true, 3);
    planetMesh.setVerticesData("starMagnitude", starMagnitudes, true, 1);
    return planetMesh;
};
const updatePlanets = function (planetMesh:any,solarSystemResult:Astro.SolarSystemResult) {
    var positions:Array<number> = [];
    var colors:Array<number> = [];
    var starMagnitudes:Array<number> = [];
    Object.keys(solarSystemResult).forEach(
      (k)=>{
        let aPlanet = solarSystemResult[k];
        if (aPlanet.body.bf != "Luna" && aPlanet.body.bf != "Sol") {
          let x = aPlanet.values.npcoords.x;
          let y = aPlanet.values.npcoords.y;
          let z = -aPlanet.values.npcoords.z;
          positions.push(x, y, z);
          let r = aPlanet.body.color[0] / 255;
          let g = aPlanet.body.color[1] / 255;
          let b = aPlanet.body.color[2] / 255;
          colors.push(r, g, b);
          starMagnitudes.push(aPlanet.values.mag);
        }
      }
    );
    var vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.applyToMesh(planetMesh, true);
    //starMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind,positions,true);
    planetMesh.setVerticesData("starColor", colors, true, 3);
    planetMesh.setVerticesData("starMagnitude", starMagnitudes, true, 1);
    return planetMesh;
};
const alterPlanets = alterStars;
export { createStars, alterStars, createPlanets, alterPlanets, updatePlanets };
//# sourceMappingURL=stars.js.map