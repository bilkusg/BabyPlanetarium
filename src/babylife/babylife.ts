/**
 * This library introduces a basic lifecycle for entities within scenes. It allows users of libraries like babylon.js to adopt a pattern similar to that
 * of aframe, in which a visual scene is composed of entitites each of which enscapsulates the logic involved in updating it when necessary, based on
 * whether certain overall state parameters have changed. 
 * The library knows nothing of the nature of the objects it manages, and could potentially be used elsewhere
 */

export interface BabyData {
  [propName: string]: any;
}
interface BabyFunc {
  (e:BabyEntity,s:BabyScene):void
}
/**
 * A BabyEntity represents part of the scene which has a lifecycle - it is initialized, potentially updated each time round the render loop
 * Typically each BabyEntity will take responsibility for a single mesh, or group of closely related meshes
 * A BabyEntity depends on one or more String parameters, and the decision whether to call update is based on whether any of the correspondingly named
 * parameters belonging to its scene have changed.
 * Although this class was designed with Babylon.js in mind, the logic really doesn't mind, which is why the mesh and data parameters are not strongly typed
 */

export class BabyEntity {
  mesh:any;
  data:BabyData = {};
  scene:BabyScene;
  children:Set<BabyEntity>;
  parent?:BabyEntity;
  dependencies:Set<string>;
  init:BabyFunc;
  update:BabyFunc;
  constructor(scene:BabyScene,parent?:BabyEntity) {
    this.mesh = null;
    this.scene = scene;
    this.children = new Set();
    this.parent = parent;
    this.dependencies = new Set();
    this.init = (e,s)=>{};
    this.update = (e,s)=>{};
    if ( this.parent) {
      this.parent.addChild(this);
    } else {
      scene.add(this);
    }
  };
  addChild(c:BabyEntity) {
    this.children.add(c);
  }
  childFirstTree():Array<BabyEntity> {
    let c = [];
    for (let sub of Array.from(this.children)) {
      for (let e of sub.childFirstTree()) {
        c.push(e);
      }
    }
    c.push(this);
    return c;
  }
  parentFirstTree():Array<BabyEntity> {
    let c = [];
    c.push(this);
    for (let sub of Array.from(this.children)) {
      for (let e of sub.parentFirstTree()) {
        c.push(e);
      }
    }
    return c;
  }
  setInit(f:BabyFunc) {
    this.init=f;
  }
  setUpdate(f:BabyFunc) {
    this.update=f;
  }
  dependsOn(pList:Array<string>) {
    for (let p of pList) {
       this.dependencies.add(p);
    }
  };
}
export class BabyScene {
  private params:BabyData;
  private changedParams:BabyData;
  private entities:Set<BabyEntity>
  scene:any
  constructor(scene:any,params:BabyData) {
    this.entities  = new Set();
    this.params = params;
    this.changedParams = {};
    this.scene = scene;
  }
  add(c:BabyEntity) {
    this.entities.add(c);
  }
  private entitiesInOrderParentFirstWhere(pred:(e:BabyEntity)=>boolean):Array<BabyEntity> {
    let cio = [];
    for (let cpt of Array.from(this.entities)) {
      for (let e of cpt.parentFirstTree()) {
        if (pred(e)) {
          cio.push(e);
        }
      }
    }
    return cio;
  }
  private entitiesInOrderChildrenFirstWhere(pred:(e:BabyEntity)=>boolean):Array<BabyEntity> {
    let cio = [];
    for (let cpt of Array.from(this.entities)) {
      for (let e of cpt.childFirstTree()) {
        if (pred(e)) {
          cio.push(e);
        }
      }
    }
    return cio;
  }
  init() {
    for ( let c of this.entitiesInOrderParentFirstWhere(()=>true) ) {
      c.init(c,this);
    }
    for ( let c of this.entitiesInOrderChildrenFirstWhere(()=>true) ) {
      c.update(c,this);
    }
  }
  update() {
    for ( let c of this.entitiesInOrderChildrenFirstWhere(
      (entity:BabyEntity)=>{
        let found = false;
        entity.dependencies.forEach(
          (dep)=>{
            if (this.changedParams.hasOwnProperty(dep))
            {
              found = true;
            }
          }
        );
        return found;
      }
    ) )
    {
      c.update(c,this);
    }
    this.reset();
  }
  changeState(newParams:any) {
    Object.assign(this.params,newParams);
    Object.assign(this.changedParams,newParams);
  }
  currentState() {
    return this.params;
  }
  changedState() {
    return this.changedParams;
  }
  reset() {
    this.changedParams = {};
  }
  hasChanged(p:string) {
    if (this.changedParams.hasOwnProperty(p)) {
      return true;
    } else {
      return false;
    }
  }
  valueOf(p:string) {
    return this.params[p];
  }
};