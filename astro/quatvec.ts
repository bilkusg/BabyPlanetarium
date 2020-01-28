// Vector functions
export type Quat = {x:number,y:number,z:number,w:number}
export type Vec = {x:number,y:number,z:number}

export const vlensq = function(v:Vec):number {
  return v.x*v.x+v.y*v.y+v.z*v.z;
};
export const vlength = function(v:Vec):number { 
  return Math.sqrt(vlensq(v));
}

export const vnormalize = function(v:Vec):Vec {
 const l = vlength(v);
  return({
    x: v.x/l,y:v.y/l,z:v.z/l,
  });
};

export const vneg = function(v:Vec):Vec {
  return({
    x:-v.x,y:-v.y,z:-v.z
  });
}
export const vadd = function(v:Vec,w:Vec):Vec {
  return({
    x:v.x+w.x,y:v.y+w.y,z:v.z+w.z
  });
};

export const vsub = function(v1:Vec,v2:Vec):Vec { // v1 - v2
  return (
    {
    x: v1.x-v2.x,
    y: v1.y-v2.y,
    z: v1.z-v2.z
    }
  );
}
export const vdot = function(v:Vec,w:Vec):number {
  return v.x*w.x+v.y*w.y+v.z*w.z;
}

export const vcross = function(v:Vec,w:Vec):Vec {
  return( {
    x: v.y*w.z-v.z*w.y,
    y: v.z*w.x-v.x*w.z,
    z: v.x*w.y-v.y*w.x,
  });
}

export const vmidpoint = function(v1:Vec, v2:Vec):Vec
{
  return (vnormalize({
    x: (v1.x+v2.x) / 2.0,
    y: (v1.y+v2.y) / 2.0,
    z: (v1.z+v2.z) / 2.0,
  }));
}

// Quaternion functions used for manual rotations
// These are identical to the shader ones we use....
export const quat_length = function(v:Quat) {
  return( Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z + v.w*v.w) );
}
export const  quat_from_axis_angle = function(axis:Vec, angle:number):Quat
{ 
  let qr:Quat = {x:0,y:0,z:0,w:0};
  let half_angle = (angle * 0.5) * 3.14159 / 180.0;
    qr.x = axis.x * Math.sin(half_angle);
    qr.y = axis.y * Math.sin(half_angle);
    qr.z = axis.z * Math.sin(half_angle);
    qr.w = Math.cos(half_angle);
    return qr;
}

export const quat_from_axis_180 = function(axis:Vec):Quat
{
    let qr:Quat = {x:0,y:0,z:0,w:0};
    qr.x = axis.x ;
    qr.y = axis.y ;
    qr.z = axis.z ;
    qr.w = 0.0;
    return qr;
}

export const quat_conj = function(q:Quat):Quat
{ 
    return ( { x:-q.x,y:-q.y,z:-q.z,w:q.w});
}
  
export const quat_mult = function(q1:Quat,q2:Quat):Quat
{ 
    let qr:Quat = {x:0,y:0,z:0,w:0};
    qr.x = (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y);
    qr.y = (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x);
    qr.z = (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w);
    qr.w = (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z);
    return qr;
}

export const rotate_vertex_position = function(position:Vec, axis:Vec, angle:number):Quat
{ 
    let qr = quat_from_axis_angle(axis, angle);
    let qr_conj = quat_conj(qr);
    let q_pos = {x:position.x, y:position.y, z:position.z, w:0};
    
    let q_tmp = quat_mult(qr, q_pos);
    qr = quat_mult(q_tmp, qr_conj);
    
    return qr;
}

export const rotate_vertex_position_180 = function (position:Vec, axis:Vec):Quat
{ 
    let qr = quat_from_axis_180(axis);
    let qr_conj = quat_conj(qr);
    let q_pos = {x:position.x, y:position.y, z:position.z, w:0};
    
    let q_tmp = quat_mult(qr, q_pos);
    qr = quat_mult(q_tmp, qr_conj);
    
    return qr;
}

export const move_v3_from_v1_to_v2 = function(v1:Vec,v2:Vec,v3:Vec):Quat {
  if (vdot(v1,v2) < -0.1) {
    // If v1 and v2 are oblique, the midoint calculation is problematic
    // So we do some reflection first...
    return move_v3_from_v1_to_v2(vsub({x:0,y:0,z:0},v1),v2,vsub({x:0,y:0,z:0},v3));
  }
  let mp = vmidpoint(vnormalize(v1),vnormalize(v2));
  let i1 = rotate_vertex_position_180(v3,mp);
  let result = rotate_vertex_position_180(i1,v2);
  return result;
}
