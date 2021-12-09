/*
 * Library to provide key astronomical information in javascript 
 * Originally developed for use in a Web app to display the night sky on an 
 * oculus quest.
 * Written by Gary Bilkus 2019/2020/2021/2022
 * GPL or BSD licensed.
 * 
 * Acknowledgements to multiple sources of algorithms and other libraries, in particular:

  http://www.astronexus.com/hyg is the source of the data in csv which I converted to a js file for convenience
  Orb2 http://www.lizard-tail.com/isana/lab/orbjs/ is a library for planetary calculations
*/
import  * as quatvec from "./quatvec"; // quaternions and vectors

export const metersPerAu = 149597870700;
export const RadPerDeg=Math.PI/180;
export const DegsPerRad = 180/Math.PI; // converting between degs and rads is a pain!

// Converts time in UT in the gregorian calendar into the corresponding Julian Date
export const utToJulianDate = function(year:number,month:number,day:number,hour:number,minute:number,second:number) { 
  // for gregorian calendar universal time
  if(month <= 2){
    year = year - 1;
    month = month + 12;
  }
  let julianDay = Math.floor(365.25*(year+4716))+Math.floor(30.6001*(month+1))+day-1524.5; // This is the julian calendar julian day
  let timeInDay = hour/24 + minute/1440 + second/86400;
  const tmp = Math.floor(year/100);
  const transitionOffset=2-tmp+Math.floor(tmp/4); // this is the correction for gregorian
  return julianDay+transitionOffset+timeInDay ;
}

export const dateToJulianDate = function(d:Date) {
  return d.getTime() / (86400000) + 2440587.5;
}

export const greenwichSiderealHoursFromJd = function(jd:number){ // greenwich mean sidereal time in hours
  const rad=Math.PI/180;
  const jdTimeOfDay = (jd+0.5) % 1;
  const jdDay = jd - jdTimeOfDay; // should be n+0.5 as this is meant to be midnight
  //gmst at 0:00
  const t = (jdDay-2451545.0)/36525;
  let gmst_at_zero = ((24110.5484 + 8640184.812866*t+0.093104*t*t+0.0000062*t*t*t)/3600) % 24;
  //gmst at target time
  let gmst = gmst_at_zero+(jdTimeOfDay*24 * 1.00273790925);
  //mean obliquity of the ecliptic
  let e = 23+26.0/60+21.448/3600 -46.8150/3600*t -0.00059/3600*t*t +0.001813/3600*t*t*t;
  //nutation in longitude
  let omega = 125.04452-1934.136261*t+0.0020708*t*t+t*t*t/450000;
  let long1 = 280.4665 + 36000.7698*t;
  let long2 = 218.3165 + 481267.8813*t;
  let phai = -17.20*Math.sin(omega*rad)-(-1.32*Math.sin(2*long1*rad))-0.23*Math.sin(2*long2*rad) + 0.21*Math.sin(2*omega*rad);
  gmst =gmst + ((phai/15)*(Math.cos(e*rad)))/3600
  if(gmst<0){gmst=gmst%24+24;}
  if(gmst>24){gmst=gmst%24;}
  return gmst
}

export const jdToModifiedJulianDate = function(jd:number) {
  return jd - 2400000.5;  
}

export const jdToTruncatedJulianDate = function (jd:number) {
  return Math.floor(jd - 2440000.5);
}

export const deltaT = function(year:number,month:number) {      //NASA - Polynomial Expressions for Delta T to convert to ephemeris time
  //http://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html
  const y = year + (month - 0.5)/12
  let dt = 0;
  let u =0;
  let t = 0;
  if(year<=-500){
     u = (y-1820)/100
     dt = -20 + 32 * u*u;
  }else if(year>-500 && year<=500){
     u = y/100;
     dt = 10583.6 - 1014.41 * u + 33.78311 * u*u - 5.952053 * u*u*u - 0.1798452 * u*u*u*u + 0.022174192 * u*u*u*u*u + 0.0090316521 * u*u*u*u*u; 
  }else if(year>500 && year<=1600){
     u = (y-1000)/100
     dt = 1574.2 - 556.01 * u + 71.23472 * u*u + 0.319781 * u*u*u - 0.8503463 * u*u*u*u - 0.005050998 * u*u*u*u*u + 0.0083572073 * u*u*u*u*u*u;
  }else if(year>1600 && year<=1700){
     t = y - 1600
     dt = 120 - 0.9808 * t - 0.01532 * t*t + t*t*t/7129
  }else if(year>1700 && year<=1800){
     t = y - 1700
     dt = 8.83 + 0.1603 * t - 0.0059285 * t*t + 0.00013336 * t*t*t - t*t*t*t/1174000
  }else if(year>1800 && year<=1860){
     t = y - 1800
     dt = 13.72 - 0.332447 * t + 0.0068612 * t*t + 0.0041116 * t*t*t - 0.00037436 * t*t*t*t + 0.0000121272 * t*t*t*t*t - 0.0000001699 * t*t*t*t*t*t + 0.000000000875 * t*t*t*t*t*t*t;
  }else if(year>1860 && year<=1900){
     t = y - 1860
     dt = 7.62 + 0.5737 * t - 0.251754 * t*t + 0.01680668 * t*t*t -0.0004473624 * t*t*t*t + t*t*t*t*t/233174
  }else if(year>1900 && year<=1920){
     t = y - 1900
     dt = -2.79 + 1.494119 * t - 0.0598939 * t*t + 0.0061966 * t*t*t - 0.000197 * t*t*t*t
  }else if(year>1920 && year<=1941){
     t = y - 1920
     dt = 21.20 + 0.84493*t - 0.076100 * t*t + 0.0020936 * t*t*t
  }else if(year>1941 && year<=1961){
     t = y - 1950
     dt = 29.07 + 0.407*t - t*t/233 + t*t*t/2547
  }else if(year>1961 && year<=1986){
     t = y - 1975
     dt = 45.45 + 1.067*t - t*t/260 - t*t*t/718
  }else if(year>1986 && year<=2005){
     t = y - 2000
     dt = 63.86 + 0.3345 * t - 0.060374 * t*t + 0.0017275 * t*t*t + 0.000651814 * t*t*t*t + 0.00002373599 * t*t*t*t*t
  }else if(year>2005 && year<=2050){
     t = y - 2000
     dt = 62.92 + 0.32217 * t + 0.005589 * t*t
  }else if(year>2050 && year<=2150){
    /*
    This expression is derived from estimated values of ΔT in the years 2010 and 2050. The value for 2010 (66.9 seconds) is based on a linearly extrapolation from 2005 using 0.39 seconds/year (average from 1995 to 2005). The value for 2050 (93 seconds) is linearly extrapolated from 2010 using 0.66 seconds/year (average rate from 1901 to 2000).
    */
     dt = -20 + 32 * ((y-1820)/100)*((y-1820)/100) - 0.5628 * (2150 - y)
    //The last term is introduced to eliminate the discontinuity at 2050.
  }else if(year>2150){
     u = (y-1820)/100
     dt = -20 + 32 * u*u
  }
return dt;
}
// An AstroTime represents an immutable date for which various useful calculations have been performed. The input date is just a java date, but all the
// exposed values are converted to UT
// Note that month is 1 for Jan not 0.
// The advantage of AstroTime is that typically we need to do these calculations multiple times, and it's therefore worth caching them
export class AstroTime {
  readonly year:number;
  readonly month:number;
  readonly day:number;
  readonly hour:number;
  readonly minute:number;
  readonly second:number;
  readonly timezone:number;
  readonly date:Date;  
  readonly julianDate:number;
  readonly siderealHoursAtGreenwich:number;

  constructor(date:Date) {
    if (!date) {
      this.date = new Date();
    } else {
      this.date = date;
    }
    const _date = this.date;
    this.year = _date.getUTCFullYear();
    this.month = _date.getUTCMonth()+1;
    this.day =  _date.getUTCDate();
    this.hour =  _date.getUTCHours();
    this.minute =  _date.getUTCMinutes();
    this.second = _date.getUTCSeconds();
    this.timezone = _date.getTimezoneOffset()/60;
    this.julianDate = dateToJulianDate(_date);
    this.siderealHoursAtGreenwich = greenwichSiderealHoursFromJd(this.julianDate);
  } 
}

// If the date passed is null, assumes the date is sidereal time 0 at greenwich.
// Note that this is not the same as Date 0, which is a specific time in 1970
// when the sidereal time was not 0 at greenwich
// We use this functionality in order to calculate positions in a standard 
// configuration which is at the north pole at lst 0

// Returns local sidereal time as an angle in degrees
export const localSiderealDegrees = function(timeAt:AstroTime|null,longitude:number) {
  if ( timeAt == null) {
    return(longitude);
  }
  const g = greenwichSiderealHoursFromJd(timeAt.julianDate) * 360 / 24; // convert to degrees
  return ((g + longitude + 360) % 360);
}

// Given an object's right ascension and the date and longitude
// calculate the hour angle which is measured west from south
// ra is defined as the local sidereal time when the object's hour angle is 0
// So objects increase in ra as one goes east. 
export const localHADegrees = function(timeAt:AstroTime|null,longitude:number,ra:number) {
  let lst = localSiderealDegrees(timeAt,longitude);
  const hourangle = (lst - ra + 360) % 360;
  return hourangle;
}
// theta is +90..-90 phi goes west from south
// If we use this for ra and dec then theta is dec and phi is -ra;
export const rhoThetaPhiToXYZ = function(rho:number,theta:number,phi:number)  {
  const x = - Math.cos(theta/DegsPerRad) * Math.sin(phi/DegsPerRad) * rho;
  const y =  Math.sin(theta/DegsPerRad) * rho;
  const z =  Math.cos(theta/DegsPerRad) * Math.cos(phi/DegsPerRad) * rho;
  return({x:x,y:y,z:z});
}
// Converts given ra and dec to alt and az for location on earth, and also
// provides the xyz coordinates on a sphere of the given radius ( which are 
// actually the data we really need to place the object using 3d libraries )
// We commonly pass a null date and a latitude of 90 degrees to this function
// and position the sky correctly by rotating it later, so we optimise that case
// Azimuth is measured eastwards from north. 
// At the north pole it is 180 + hourangle
interface AAXYZ { ra: number, dec: number, timeAt: AstroTime|null, x:number, y:number, z:number, alt:number, az: number};
const raDecToAltAzandXYZ =  function(lat:number,longitude:number, ra:number, dec:number, timeAt:AstroTime|null, sphereAt:number,display:boolean) {
  let result:AAXYZ;
  const decrads = dec / DegsPerRad;
  const hourangle = localHADegrees(timeAt,longitude,ra);
  const houranglerads = hourangle / DegsPerRad;
        // first we calculate the coords at the north pole 
        // x is east, y is up and z is south using the standard Three.js conventions
  const xeq = - Math.cos(decrads) * Math.sin(houranglerads);// minus sign because hourangle goes clockwise 
  const yeq = Math.sin(decrads); 
  const zeq = Math.cos(decrads) * Math.cos(houranglerads);  
        // now we rotate by the colatitude in the y-z plane moving y towards the north
  if (lat == 90) {
     result= { ra: ra, dec: dec, timeAt: timeAt, x: sphereAt*xeq, y: sphereAt*yeq, z:sphereAt*zeq, alt: dec, az: (180+hourangle)%360};
  } else {
    const colatrads = (90-lat) / DegsPerRad;
    const x = xeq
    const y = yeq * Math.cos(colatrads) + zeq * Math.sin(colatrads);
    const z = - yeq * Math.sin(colatrads) + zeq * Math.cos(colatrads);
    const azrads = Math.atan2(-x,z);
    const altrads = Math.asin(y);
    result= { ra: ra, dec: dec, timeAt: timeAt, x: sphereAt*x, y: sphereAt*y, z:sphereAt*z, alt: altrads * DegsPerRad, az: azrads * DegsPerRad };
  }
  if (display) { console.log(ra,dec,lat,longitude,result); };
  return result;
};
// A partial inverse to the previous function.
// Given xyz coordinates of a point corresponding to an object in the sky
// at given place and time, what ra and dec does it correspond to
export const XYZToRaDec = function(lat:number,longitude:number,x:number,y:number,z:number,timeAt:AstroTime) {
  let lst = localSiderealDegrees(timeAt,longitude);
  let colatrads = (90-lat)*RadPerDeg;
  let xyzlen = Math.sqrt(x*x+y*y+z*z);
  let xeq = x / xyzlen;
  let yeq = (y * Math.cos(colatrads) - z * Math.sin(colatrads))/xyzlen;
  let zeq = (y * Math.sin(colatrads) + z * Math.cos(colatrads))/xyzlen;
  let decrads = Math.asin(yeq);
  let dec = decrads * DegsPerRad;
  let houranglerads = Math.atan2(-xeq,zeq);
  let hourangle = houranglerads * DegsPerRad;
  let ra = (lst - hourangle + 360) % 360;
  return({ra:ra,dec:dec});
};

// all in degrees
// Given the coordinates of an object and the sun, calculate the phase and phase angle of the lit part as seen from the origin.
// Our conventions here are as follows:
// phase ranges from 0.0 to 360.0 where 0 means that the sun is directly behind the unlit object, 180 means directly in front of a fully lit one
// and 90 corresponds to half lit on the left when the rotation is from the top.
// phase angle is in degrees anticlockwise from vertical ( i.e. y axis ).
// Note that this means that the following are all essentially the same thing:
//   phase 90 angle 0 and phase 270 angle 180
// Also note that with these ( normal ) conventions, the moon's phase goes backwards while those of the inner planets go forward.
// One challenge with this function is that if the phase is 0 or 180 the phase angle is undefined 
export const litPointRotationCalc = function (obsFromSun:quatvec.Vec,planetFromObs:quatvec.Vec) {
    let obsFromPlanet = quatvec.vneg(planetFromObs);
    let sunFromObs = quatvec.vneg(obsFromSun);
    let sunFromPlanet = quatvec.vadd(obsFromPlanet,sunFromObs);
    let sunFromPlanetUnit = quatvec.vnormalize(sunFromPlanet);
    let obsFromPlanetUnit = quatvec.vnormalize(obsFromPlanet);
    let dotprod = quatvec.vdot(sunFromPlanetUnit,obsFromPlanetUnit);
    let crossprod = quatvec.vcross(sunFromPlanetUnit,obsFromPlanetUnit);
    let phase = Math.atan2(quatvec.vlength(crossprod),dotprod) * DegsPerRad;
    return {phase:phase};
};

// Next some stuff to calculate star colours
// We need to be able to convert colour temperature from the star catalogue into rgb values
// see https://stackoverflow.com/questions/21977786/star-b-v-color-index-to-apparent-rgb-color for some info
const blackbody:any = {
1000:0xff3800, 1200:0xff5300, 1400:0xff6500, 1600:0xff7300, 1800:0xff7e00, 2000:0xff8912, 2200:0xff932c, 2400:0xff9d3f, 2600:0xffa54f,
2800:0xffad5e, 3000:0xffb46b, 3200:0xffbb78, 3400:0xffc184, 3600:0xffc78f, 3800:0xffcc99, 4000:0xffd1a3, 4200:0xffd5ad, 4400:0xffd9b6,
4600:0xffddbe, 4800:0xffe1c6, 5000:0xffe4ce, 5200:0xffe8d5, 5400:0xffebdc, 5600:0xffeee3, 5800:0xfff0e9, 6000:0xfff3ef, 6200:0xfff5f5,
6400:0xfff8fb, 6600:0xfef9ff, 6800:0xf9f6ff, 7000:0xf5f3ff, 7200:0xf0f1ff, 7400:0xedefff, 7600:0xe9edff, 7800:0xe6ebff, 8000:0xe3e9ff,
8200:0xe0e7ff, 8400:0xdde6ff, 8600:0xdae4ff, 8800:0xd8e3ff, 9000:0xd6e1ff, 9200:0xd3e0ff, 9400:0xd1dfff, 9600:0xcfddff, 9800:0xcedcff,
10000:0xccdbff, 10200:0xcadaff, 10400:0xc9d9ff, 10600:0xc7d8ff, 10800:0xc6d8ff, 11000:0xc4d7ff, 11200:0xc3d6ff, 11400:0xc2d5ff, 11600:0xc1d4ff,
11800:0xc0d4ff, 12000:0xbfd3ff, 12200:0xbed2ff, 12400:0xbdd2ff, 12600:0xbcd1ff, 12800:0xbbd1ff, 13000:0xbad0ff, 13200:0xb9d0ff, 13400:0xb8cfff,
13600:0xb7cfff, 13800:0xb7ceff, 14000:0xb6ceff, 14200:0xb5cdff, 14400:0xb5cdff, 14600:0xb4ccff, 14800:0xb3ccff, 15000:0xb3ccff, 15200:0xb2cbff,
15400:0xb2cbff, 15600:0xb1caff, 15800:0xb1caff, 16000:0xb0caff, 16200:0xafc9ff, 16400:0xafc9ff, 16600:0xafc9ff, 16800:0xaec9ff, 17000:0xaec8ff,
17200:0xadc8ff, 17400:0xadc8ff, 17600:0xacc7ff, 17800:0xacc7ff, 18000:0xacc7ff, 18200:0xabc7ff, 18400:0xabc6ff, 18600:0xaac6ff, 18800:0xaac6ff,
19000:0xaac6ff, 19200:0xa9c6ff, 19400:0xa9c5ff, 19600:0xa9c5ff, 19800:0xa9c5ff, 20000:0xa8c5ff, 20200:0xa8c5ff, 20400:0xa8c4ff, 20600:0xa7c4ff,
20800:0xa7c4ff, 21000:0xa7c4ff, 21200:0xa7c4ff, 21400:0xa6c3ff, 21600:0xa6c3ff, 21800:0xa6c3ff, 22000:0xa6c3ff, 22200:0xa5c3ff, 22400:0xa5c3ff,
22600:0xa5c3ff, 22800:0xa5c2ff, 23000:0xa4c2ff, 23200:0xa4c2ff, 23400:0xa4c2ff, 23600:0xa4c2ff, 23800:0xa4c2ff, 24000:0xa3c2ff, 24200:0xa3c1ff,
24400:0xa3c1ff, 24600:0xa3c1ff, 24800:0xa3c1ff, 25000:0xa3c1ff, 25200:0xa2c1ff, 25400:0xa2c1ff, 25600:0xa2c1ff, 25800:0xa2c1ff, 26000:0xa2c0ff,
26200:0xa2c0ff, 26400:0xa1c0ff, 26600:0xa1c0ff, 26800:0xa1c0ff, 27000:0xa1c0ff, 27200:0xa1c0ff, 27400:0xa1c0ff, 27600:0xa1c0ff, 27800:0xa0c0ff,
28000:0xa0bfff, 28200:0xa0bfff, 28400:0xa0bfff, 28600:0xa0bfff, 28800:0xa0bfff, 29000:0xa0bfff, 29200:0xa0bfff, 29400:0x9fbfff, 29600:0x9fbfff,
29800:0x9fbfff, }; 

// given a temperature - provide rgb values which correspond to the colour at maximum brightness
const blackbodyColor = function(temp:number) {
  let t = Math.floor(temp / 200);
  t = t * 200;
  if (t < 1000) {
    t = 1000;
  } else if (t > 29800) {
    t = 29800;
  }
  
  const ans = blackbody[t]; 
  let redval = ((0xff0000 & ans)  >>> 16) ;
  let greenval = ((0x00ff00 & ans)  >>> 8);
  let blueval = (0x0000ff & ans)  ;
  // exaggerate the colours for effect
  redval = 255 - 1.5*(255-redval);
  greenval =255 - 1.5*(255-greenval);
  blueval = 255 - 1.5*(255-blueval)
  if (redval < 0) { redval = 0;}
  if (greenval < 0) {greenval = 0;}
  if (blueval < 0) {blueval = 0;}
  return ([redval,greenval,blueval]);
};
// convert the colour index to a temperature
const ciToTemp = function(ci:number) {
  return (4600 * (1 / (0.92 * ci + 1.7) + 1 / (0.92 * ci + 0.62)));
};

// Now we provide methods for using the star catalogue
import * as Hyg from "./hygdata";
const starData = Hyg.hygStarCatalogue;
// The star data import is in the form of arrays rather than a more natural object, so we access them with these field names
const starDataFields={
  "bf":0, "proper":1, "ra":2, "dec":3, "dist":4, "mag":5, "spect":6, "ci":7, "con":8, "lum":9};
export const nStars = starData.data.length;

 
// convert a star's colour index and a magnitude limit to an rgb value for that star
// Note that all stars of magnitude 0 and above are max brightness, so we need another way to 
// display eveh brighter objects
const starColor = function(s:any) {
  const ci = s[starDataFields.ci];
  return blackbodyColor(ciToTemp(ci)); 
};
// There are a lot of stars in the catalogue, conveniently ordered by 
// magnitude 
// We pass a max magitude because our calculation of star rgb values is doctored
// to reflect how many stars we want to display
// Note that stars of magnitude 0 and above are all shown as maximum brightness
// Programs need to find some other way to render even brighter objects ok
export const getStarData = function(i:number,lat:number,lng:number,timeAt:AstroTime|null,starSphereAt:number,display:boolean,maxmag:number|null)  {
  let theStar = starData.data[i];
  let color = starColor(theStar);
  let name = theStar[starDataFields.bf];
  let constell = theStar[starDataFields.con];
  let proper = theStar[starDataFields.proper];
  let qqq = theStar[starDataFields.ra];
  let xyz = raDecToAltAzandXYZ(lat,lng,Number(theStar[starDataFields.ra]),Number(theStar[starDataFields.dec]),timeAt!,starSphereAt,display);
  let npxyz = raDecToAltAzandXYZ(90,0,Number(theStar[starDataFields.ra]),Number(theStar[starDataFields.dec]),null,starSphereAt,display);
  if (display) { console.log(theStar);}
  return { name:name,proper:proper,constell:constell,mag:theStar[starDataFields.mag],color:color,coords:xyz,npcoords:npxyz};
};

// we search given ra and dec for 
// the closest star ( so we can show info about what we've pointed at )
// Since the data is sorted by brightness, we can stop the search as soon as we
// reach stars less bright than those we are currently displaying
// That can save a lot of time, as most of the catalogue is vary faint
export const nearestStar = function(latitude:number,longitude:number,x:number,y:number,z:number,timeAt:AstroTime, maxMag:number) {
  let radec = XYZToRaDec(latitude,longitude,x,y,z,timeAt);
  let closestIndex = -1;
  let closestDistance = 1000000;
  for(let i = 0;i < nStars;i++) {
     let theStar = starData.data[i];
     let mag = Number(theStar[starDataFields.mag]);
     if (mag > maxMag) break;
     let starRa = Number(theStar[starDataFields.ra]);
     let raDiff = (starRa - radec.ra)
     let starDec = Number(theStar[starDataFields.dec]);
     let decDiff = (starDec - radec.dec);
     let thisDiff = raDiff*raDiff + decDiff*decDiff;  // not really the global distance but fine
     if ( thisDiff < closestDistance ) {
       closestDistance = thisDiff;
       closestIndex = i;
     }
  }
  let wantedStar = starData.data[closestIndex];
  let color = starColor(wantedStar);
  let name = wantedStar[starDataFields.bf];
  let constell = wantedStar[starDataFields.con];
  let proper = wantedStar[starDataFields.proper];
  let ra = wantedStar[starDataFields.ra];
  let dec = wantedStar[starDataFields.dec];
  let result = { name:name,proper:proper,constell:constell,mag:wantedStar[starDataFields.mag],color:color,ra:ra,dec:dec,distance:closestDistance};
  return(result);
};
// Now we focus on the solar system
// Most of this is a thin wrapper over the Orb2 functions
// What's missing from that library is good information about
// the apparent brightness of objects
// So at the moment we provide a ballpark magnitude. This is fine for the outer
// planets, but can be wildly wrong for venus and mars

import {earthData} from "./earthData";
import {mercuryData} from "./mercuryData";
import {venusData} from "./venusData";
import {marsData} from "./marsData";
import {jupiterData} from "./jupiterData";
import {saturnData} from "./saturnData";
import {uranusData} from "./uranusData";
import {neptuneData} from "./neptuneData";


const NutationAndObliquity = function(time:AstroTime){
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  const jd = time.julianDate;// + dt;
  const t = (jd -2451545.0)/36525;
  const omega = (125.04452 - 1934.136261*t+0.0020708*t*t + (t*t+t)/450000)*RadPerDeg;
  const L0 = (280.4665 + 36000.7698*t)*RadPerDeg
  const L1 = (218.3165 + 481267.8813*t)*RadPerDeg
  const nutation = (-17.20/3600)*Math.sin(omega)-(-1.32/3600)*Math.sin(2*L0)-(0.23/3600)*Math.sin(2*L1)+(0.21/3600)*Math.sin(2*omega)/RadPerDeg;
	const obliquity_zero = 23+26.0/60+21.448/3600 -(46.8150/3600)*t -(0.00059/3600)*t*t +(0.001813/3600)*t*t*t; 
	const obliquity_delta = (9.20/3600)*Math.cos(omega) + (0.57/3600)*Math.cos(2*L0) +(0.10/3600)*Math.cos(2*L1)-(0.09/3600)*Math.cos(2*omega);
  const obliquity= obliquity_zero + obliquity_delta;
	return {
	  nutation:nutation,
		obliquity:obliquity
	}
}
const PlanetPositionEcliptic = function(time:AstroTime,d:any){
    const data = d.data;
    const jd = time.julianDate;
    const data_length = data.length;
    const t = ((jd -2451545.0)/365250);
    let v = [0,0,0];
    const td = data[0].v
    for(let i=0;i<data_length; i++){
      const tmp_data = data[i].v;
      const n = tmp_data[0];
      const sum = Math.pow(t,Number(tmp_data[1]))*Number(tmp_data[2]) * Math.cos(Number(tmp_data[3]) + Number(tmp_data[4]) * t);
      v[n] = v[n]  + sum;
    }
    return {
    x:v[0]*metersPerAu,
    y:v[1]*metersPerAu,
    z:v[2]*metersPerAu
    }
  }

const EclipticToEquatorial = function(from:quatvec.Vec,to:quatvec.Vec){

    const gcx = from.x-to.x; 
    const gcy = from.y-to.y; 
    const gcz =from.z-to.z;

    const ecl = 23.439281;
    const eqx = gcx
    const eqy = gcy*Math.cos(ecl*RadPerDeg) - gcz * Math.sin(ecl*RadPerDeg)
    const eqz = gcy*Math.sin(ecl*RadPerDeg) + gcz * Math.cos(ecl*RadPerDeg)

    let ra = Math.atan2(eqy,eqx)* DegsPerRad;
    if (ra <0){
      ra = ra%360+360
    }
    if(ra >360){
      ra = ra%360
    }

    const dec = Math.atan2(eqz,Math.sqrt(eqx*eqx + eqy*eqy))*DegsPerRad;
    const distance = Math.sqrt(eqx*eqx + eqy*eqy + eqz*eqz);  
    return {
      "ra":ra,
      "dec":dec,
      "distance":distance,
      "x":eqx,
      "y":eqy,
      "z":eqz
    };
}
const EarthPosition = function(time:AstroTime){
    const earth_ecliptic = PlanetPositionEcliptic(time,earthData);
    return {
      x : earth_ecliptic.x,
      y : earth_ecliptic.y,
      z : earth_ecliptic.z
    }
}

export const FromKeplerian = function(orbital_elements:any,time:AstroTime){
  const au = 149597870.691;

  function deg2rad(d:number){
    return d*(Math.PI/180);
  }

  function rad2deg(r:number){
    return r*(180/Math.PI);
  }

  let eccentricity = Number(orbital_elements.eccentricity);
  const gm = 2.9591220828559093*Math.pow(10,-4);
  
  if(orbital_elements.time_of_periapsis){
    var epoch = orbital_elements.time_of_periapsis;
  }else{
    var epoch = orbital_elements.epoch;
  }
     
  const EllipticalOrbit = function(orbital_elements:any,time:AstroTime){
    let semi_major_axis = 0;
    let mean_anomaly = 0;
    let l = 0;
    if(orbital_elements.semi_major_axis){
      semi_major_axis = Number(orbital_elements.semi_major_axis);
    }else if(orbital_elements.perihelion_distance){
      semi_major_axis = (orbital_elements.perihelion_distance)/(1-eccentricity)
    }
    let mean_motion = rad2deg(Math.sqrt(gm/(semi_major_axis*semi_major_axis*semi_major_axis)));
    let elapsed_time = Number(time.julianDate)-Number(epoch);
    if(orbital_elements.mean_anomaly && orbital_elements.epoch){
      mean_anomaly = Number(orbital_elements.mean_anomaly);
      l=(mean_motion*elapsed_time)+mean_anomaly;
    }else if(orbital_elements.time_of_periapsis){
      mean_anomaly = mean_motion*elapsed_time;
      l=mean_anomaly;
    }
    if(l>360){l=l%360}
    l = deg2rad(l)
    let u=l
    let  i = 0;
    let ut = 0;
    let delta_u = 0;
    do{
      ut=u;
      delta_u=(l-u+(eccentricity*Math.sin(u)))/(1- (eccentricity*Math.cos(u)));
      u=u+delta_u;
      if(i>100000){
        break
      }
      i++
    }while (Math.abs(ut-u)>0.00000001);
    if(rad2deg(u)<0){u = deg2rad(rad2deg(u)+360)}
    let orbital_plane= {
      x:semi_major_axis*(Math.cos(u)-eccentricity),
      y:semi_major_axis*Math.sqrt(1-Math.pow(eccentricity,2))*Math.sin(u),
      r:semi_major_axis*(1-(eccentricity*Math.cos(u)))
    }
  return orbital_plane;
  }
    
  const ParabolicOrbit = function(orbital_elements:any,time:AstroTime){
    const perihelion_distance = Number(orbital_elements.perihelion_distance);
    const mean_motion = rad2deg(Math.sqrt(gm/(2*perihelion_distance*perihelion_distance*perihelion_distance)));
    const elapsed_time = Number(time.julianDate)-Number(epoch);
    let mean_anomaly = 0;
    let l = 0;
    if(orbital_elements.mean_anomaly){
      mean_anomaly = Number(orbital_elements.mean_anomaly);
      l=mean_motion*elapsed_time+mean_anomaly;
    }else{
      mean_anomaly = mean_motion*elapsed_time;
      l=mean_anomaly;
    }
    if(l>360){
      l=l%360
    }
    if(l<0){
      l=360-(Math.abs(l)%360)
    }
    l = deg2rad(l)
    const b = Math.atan(2/(3*l));
    const g = Math.atan(Math.pow(Math.tan(b/2),1/3));
    const v = 2.0/Math.tan(2*g)
    const f = Math.atan(v)*2
    const r = (2*perihelion_distance)/(1+Math.cos(f))
    const orbital_plane= {
      x:r*Math.cos(f),
      y:r*Math.sin(f),
      r:r
    }
    return orbital_plane;
  }


  const HyperbolicOrbit = function(orbital_elements:any,time:AstroTime){
    const cosh = function(x:number) {
        const y = Math.exp(x);
        return (y + 1 / y) / 2;
    }
    
    const sinh = function(x:number) {
        const y = Math.exp(x);
        return (y - 1/y) / 2;
    }
        let semi_major_axis = 0;
    if(orbital_elements.semi_major_axis && orbital_elements.semi_major_axis>0){
      semi_major_axis = Number(orbital_elements.semi_major_axis);
    }else if(orbital_elements.perihelion_distance){
      semi_major_axis = orbital_elements.perihelion_distance/(eccentricity-1);
    }
    const mean_motion = rad2deg(Math.sqrt(gm/(semi_major_axis*semi_major_axis*semi_major_axis)));
    const elapsed_time = Number(time.julianDate)-Number(epoch);
    let mean_anomaly = 0;
    let l = 0;
    if(orbital_elements.mean_anomaly && orbital_elements.epoch){
      mean_anomaly = Number(orbital_elements.mean_anomaly);
      l=mean_motion*elapsed_time+mean_anomaly;
    }else{
      mean_anomaly = mean_motion*elapsed_time;
      l=mean_anomaly;
    }
    if(l>360){l=l%360}
    l = deg2rad(l)
    let u=l;
    let i=0;
    let ut=0;
    let delta_u = 0;
    do{
      ut=u;
      delta_u=(l-(eccentricity*sinh(u))+u)/((eccentricity*cosh(u))-1);
      u=u+delta_u;
      if(i++>100000){
        break
      }
    } while (Math.abs(ut-u)>0.00001);
    //if(rad2deg(u)<0){u = deg2rad(rad2deg(u)+360)}
    let orbital_plane= {
      x:semi_major_axis*(eccentricity-cosh(u)),
      y:semi_major_axis*Math.sqrt(Math.pow(eccentricity,2)-1)*sinh(u),
      r:semi_major_axis*(1-(eccentricity*cosh(u)))
    }
    return orbital_plane;
  }

  
  const ecliptic_rectangular = function(orbital_elements:any,orbital_plane:any){
    const lan = deg2rad(Number(orbital_elements.longitude_of_ascending_node));
    const ap = deg2rad(Number(orbital_elements.argument_of_periapsis));
    const inc = deg2rad(Number(orbital_elements.inclination));
    const x  = orbital_plane.x*(Math.cos(lan)*Math.cos(ap)-Math.sin(lan)*Math.cos(inc)*Math.sin(ap))-orbital_plane.y*(Math.cos(lan)*Math.sin(ap)+Math.sin(lan)*Math.cos(inc)*Math.cos(ap));
    const y = orbital_plane.x*(Math.sin(lan)*Math.cos(ap)+Math.cos(lan)*Math.cos(inc)*Math.sin(ap))-orbital_plane.y*(Math.sin(lan)*Math.sin(ap)-Math.cos(lan)*Math.cos(inc)*Math.cos(ap))
    const z = orbital_plane.x*Math.sin(inc)*Math.sin(ap)+orbital_plane.y*Math.sin(inc)*Math.cos(ap);
    return {
      x:x,
      y:y,
      z:z,
      orbital_plane:orbital_plane
    };
  }
  let orbital_plane:any = null;
  if(eccentricity<1.0){
      orbital_plane = EllipticalOrbit(orbital_elements,time);
  }else if(eccentricity>1.0){
      orbital_plane = HyperbolicOrbit(orbital_elements,time);
  }else if(eccentricity == 1.0){
    eccentricity = 1.0000001; // Fallback: Parabolic Orbit not working properly. 
    orbital_plane = HyperbolicOrbit(orbital_elements,time);
    //var orbital_plane = ParabolicOrbit(orbital_elements,time); 
  }
  const position = ecliptic_rectangular(orbital_elements,orbital_plane);
    return {
      x:position.x,
      y:position.y,
      z:position.z,
      orbital_plane:position.orbital_plane
  };
} // end of fromKeplerian

const round_angle = function(angle:number){
    if(angle>360){
      angle= angle%360
    }else if(angle<0){
      angle= angle%360+360
    }else{
      angle = angle;
    }
    return angle;
}

const SunPosition = function(time:AstroTime){
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  var jd = time.julianDate;// + dt;
  var t = (jd -2451545.0)/36525;
  //geometric_mean_longitude
  var mean_longitude = 280.46646 + 36000.76983*t + 0.0003032*t*t;
  //mean anomaly of the Sun
  var mean_anomaly =  357.52911+ 35999.05029*t - 0.0001537*t*t;
  //eccentricity of the Earth's orbit
  var eccentricity = 0.016708634 - 0.000042037*t - 0.0000001267*t*t;
  //Sun's equation of  the center
  var equation = (1.914602 - 0.004817*t - 0.000014*t*t)*Math.sin(mean_anomaly*RadPerDeg);
  equation += (0.019993 - 0.000101*t)*Math.sin(2*mean_anomaly*RadPerDeg);
  equation += 0.000289 *Math.sin(3*mean_anomaly*RadPerDeg);
  //true longitude of the Sun
  var true_longitude = mean_longitude + equation;
  //true anomary of the Sun
  var true_anomary = mean_anomaly + equation;
  //radius vector, distance between center of the Sun and the Earth
  var radius = (1.000001018*(1-eccentricity*eccentricity))/(1 + eccentricity*Math.cos(true_anomary*RadPerDeg));

  var nao = NutationAndObliquity(time);
  var nutation = nao.nutation;
  var obliquity = nao.obliquity;
  var apparent_longitude = true_longitude + nutation;
  var longitude = apparent_longitude;

  //right asantion of the Sun
  var ra = Math.atan2(Math.cos(obliquity*RadPerDeg)*Math.sin(longitude*RadPerDeg), Math.cos(longitude*RadPerDeg))
  ra = round_angle(ra/RadPerDeg);
  //declination of the Sun
  var dec = Math.asin(Math.sin(obliquity*RadPerDeg)*Math.sin(longitude*RadPerDeg));
  dec=dec/RadPerDeg;
  var distance=radius // *149597870.691;
  //rectanger
  var x = distance*Math.cos(longitude*RadPerDeg);
  var y = distance*(Math.sin(longitude*RadPerDeg)*Math.cos(obliquity*RadPerDeg));
  var z = distance*(Math.sin(longitude*RadPerDeg)*Math.sin(obliquity*RadPerDeg));
  return {
  ra : ra,
  dec : dec,
  distance : distance,
  x : x,
  y : y,
  z : z
  }
}

const MoonPosition = function(time:AstroTime){
  //var dt = DeltaT()/86400;
  //var dt = 64/86400;
  var jd = time.julianDate; // + dt;
  //ephemeris days from the epch J2000.0
  var t = (jd -2451545.0)/36525;
  var t2 = t*t;
  var t3 = t*t*t;
  var t4 = t*t*t*t;
  var e = 1- 0.002516*t - 0.0000074*t2;
  var L1 = (218.3164477 + 481267.88123421*t - 0.0015786*t2 + t3/538841 - t4/65194000);
  L1 = round_angle(L1)*RadPerDeg;
  var D0 = (297.8501921 + 445267.1114034*t - 0.0018819*t2 + t3/545868 - t4/113065000);
  D0 = round_angle(D0)*RadPerDeg;
  var M0 = (357.5291092 + 35999.0502909*t - 0.0001536*t2 + t3/24490000);
  M0 = round_angle(M0)*RadPerDeg;
  var M1 = (134.9633964 + 477198.8675055*t + 0.0087414*t2 + t3/69699 - t4/14712000);
  M1 = round_angle(M1)*RadPerDeg;
  var F0 = (93.2720950 + 483202.0175233*t - 0.0036539 *t2 - t3/3526000 + t4/863310000);
  F0 = round_angle(F0)*RadPerDeg;
  var A1 = (119.75 + 131.849*t);
  A1 = round_angle(A1)*RadPerDeg;
  var A2 = (53.09 + 479264.290*t);
  A2 = round_angle(A2)*RadPerDeg;
  var A3 = (313.45 + 481266.484*t);
  A3 = round_angle(A3)*RadPerDeg;

  var SigmaL = function(){
    var result =0;
    var terms = LunaTerms.LR;
    var terms_length = terms.length;
    for(var i = 0; i< terms_length;i++){
      var coef = terms[i][4];
      var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
      if(Math.abs(multi[1]) == 1){
        var e_coef = e;
      }else if(Math.abs(multi[1]) == 2){
        var e_coef = e*e;
      }else{
        var e_coef = 1;
      }
      var asin = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0;
      result += coef * Math.sin(asin) * e_coef;
    }
    result += 3958*Math.sin(A1)
    result += 1962*Math.sin(L1-F0)
    result += 318*Math.sin(A2)

    return result;
  }

  var SigmaR = function(){
    var result =0;
    var terms = LunaTerms.LR;
    var terms_length = terms.length;
    for(var i = 0; i< terms_length;i++){
      var coef = terms[i][5];
      var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
      if(Math.abs(multi[1]) == 1){
        var e_coef = e;
      }else if(Math.abs(multi[1]) == 2){
        var e_coef = e*e;
      }else{
        var e_coef = 1;
      }
      var acos = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0
      result += coef * Math.cos(acos) * e_coef;
    }
    return result;
  }

  var SigmaB = function(){
    var result =0;
    var terms = LunaTerms.B;
    var terms_length = terms.length;
    for(var i = 0; i< terms_length;i++){
      var coef = terms[i][4];
      var multi = [terms[i][0],terms[i][1],terms[i][2],terms[i][3]]
      if(Math.abs(multi[1]) == 1){
        var e_coef = e;
      }else if(Math.abs(multi[1]) == 2){
        var e_coef = e*e;
      }else{
        var e_coef = 1;
      }
      var asin = multi[0]*D0 + multi[1]*M0 + multi[2]*M1 + multi[3]*F0
      result += coef * Math.sin(asin) * e_coef;
    }
    result += -2235*Math.sin(L1)
    result += 382*Math.sin(A3)
    result += 175*Math.sin(A1-F0)
    result += 175*Math.sin(A1+F0)
    result += 127*Math.sin(L1-M1)
    result += -115*Math.sin(L1+M1)
    return result;
  }

  var LunaTerms = {
    LR: [
      [0,  0,  1,  0,  6288774, -20905335],
      [2,  0, -1,  0,  1274027,  -3699111],
      [2,  0,  0,  0,   658314,  -2955968],
      [0,  0,  2,  0,   213618,   -569925],
      [0,  1,  0,  0,  -185116,     48888],
      [0,  0,  0,  2,  -114332,     -3149],
      [2,  0, -2,  0,    58793,    246158],
      [2, -1, -1,  0,    57066,   -152138],
      [2,  0,  1,  0,    53322,   -170733],
      [2, -1,  0,  0,    45758,   -204586],
      [0,  1, -1,  0,   -40923,   -129620],
      [1,  0,  0,  0,   -34720,    108743],
      [0,  1,  1,  0,   -30383,    104755],
      [2,  0,  0, -2,    15327,     10321],
      [0,  0,  1,  2,   -12528,         0],
      [0,  0,  1, -2,    10980,     79661],
      [4,  0, -1,  0,    10675,    -34782],
      [0,  0,  3,  0,    10034,    -23210],
      [4,  0, -2,  0,     8548,    -21636],
      [2,  1, -1,  0,    -7888,     24208],
      [2,  1,  0,  0,    -6766,     30824],
      [1,  0, -1,  0,    -5163,     -8379],
      [1,  1,  0,  0,     4987,    -16675],
      [2, -1,  1,  0,     4036,    -12831],
      [2,  0,  2,  0,     3994,    -10445],
      [4,  0,  0,  0,     3861,    -11650],
      [2,  0, -3,  0,     3665,     14403],
      [0,  1, -2,  0,    -2689,     -7003],
      [2,  0, -1,  2,    -2602,         0],
      [2, -1, -2,  0,     2390,     10056],
      [1,  0,  1,  0,    -2348,      6322],
      [2, -2,  0,  0,     2236,     -9884],
      [0,  1,  2,  0,    -2120,      5751],
      [0,  2,  0,  0,    -2069,         0],
      [2, -2, -1,  0,     2048,     -4950],
      [2,  0,  1, -2,    -1773,      4130],
      [2,  0,  0,  2,    -1595,         0],
      [4, -1, -1,  0,     1215,     -3958],
      [0,  0,  2,  2,    -1110,         0],
      [3,  0, -1,  0,     -892,      3258],
      [2,  1,  1,  0,     -810,      2616],
      [4, -1, -2,  0,      759,     -1897],
      [0,  2, -1,  0,     -713,     -2117],
      [2,  2, -1,  0,     -700,      2354],
      [2,  1, -2,  0,      691,         0],
      [2, -1,  0, -2,      596,         0],
      [4,  0,  1,  0,      549,     -1423],
      [0,  0,  4,  0,      537,     -1117],
      [4, -1,  0,  0,      520,     -1571],
      [1,  0, -2,  0,     -487,     -1739],
      [2,  1,  0, -2,     -399,         0],
      [0,  0,  2, -2,     -381,     -4421],
      [1,  1,  1,  0,      351,         0],
      [3,  0, -2,  0,     -340,         0],
      [4,  0, -3,  0,      330,         0],
      [2, -1,  2,  0,      327,         0],
      [0,  2,  1,  0,     -323,      1165],
      [1,  1, -1,  0,      299,         0],
      [2,  0,  3,  0,      294,         0],
      [2,  0, -1, -2,        0,      8752]
    ],
    B:[
      [0,  0,  0,  1, 5128122],
      [0,  0,  1,  1,  280602],
      [0,  0,  1, -1,  277693],
      [2,  0,  0, -1,  173237],
      [2,  0, -1,  1,   55413],
      [2,  0, -1, -1,   46271],
      [2,  0,  0,  1,   32573],
      [0,  0,  2,  1,   17198],
      [2,  0,  1, -1,    9266],
      [0,  0,  2, -1,    8822],
      [2, -1,  0, -1,    8216],
      [2,  0, -2, -1,    4324],
      [2,  0,  1,  1,    4200],
      [2,  1,  0, -1,   -3359],
      [2, -1, -1,  1,    2463],
      [2, -1,  0,  1,    2211],
      [2, -1, -1, -1,    2065],
      [0,  1, -1, -1,   -1870],
      [4,  0, -1, -1,    1828],
      [0,  1,  0,  1,   -1794],
      [0,  0,  0,  3,   -1749],
      [0,  1, -1,  1,   -1565],
      [1,  0,  0,  1,   -1491],
      [0,  1,  1,  1,   -1475],
      [0,  1,  1, -1,   -1410],
      [0,  1,  0, -1,   -1344],
      [1,  0,  0, -1,   -1335],
      [0,  0,  3,  1,    1107],
      [4,  0,  0, -1,    1021],
      [4,  0, -1,  1,     833],
      [0,  0,  1, -3,     777],
      [4,  0, -2,  1,     671],
      [2,  0,  0, -3,     607],
      [2,  0,  2, -1,     596],
      [2, -1,  1, -1,     491],
      [2,  0, -2,  1,    -451],
      [0,  0,  3, -1,     439],
      [2,  0,  2,  1,     422],
      [2,  0, -3, -1,     421],
      [2,  1, -1,  1,    -366],
      [2,  1,  0,  1,    -351],
      [4,  0,  0,  1,     331],
      [2, -1,  1,  1,     315],
      [2, -2,  0, -1,     302],
      [0,  0,  1,  3,    -283],
      [2,  1,  1, -1,    -229],
      [1,  1,  0, -1,     223],
      [1,  1,  0,  1,     223],
      [0,  1, -2, -1,    -220],
      [2,  1, -1, -1,    -220],
      [1,  0,  1,  1,    -185],
      [2, -1, -2, -1,     181],
      [0,  1,  2,  1,    -177],
      [4,  0, -2, -1,     176],
      [4, -1, -1, -1,     166],
      [1,  0,  1, -1,    -164],
      [4,  0,  1, -1,     132],
      [1,  0, -1, -1,    -119],
      [4, -1,  0, -1,     115],
      [2, -2,  0,  1,     107]
    ]
  }

  var sigma_l = SigmaL();
  var sigma_r = SigmaR();
  var sigma_b = SigmaB();


  var true_longitude = (L1/RadPerDeg)%360  + (sigma_l)/1000000
  var latitude = (sigma_b)/1000000
  var distance = 385000560 + sigma_r; // in meters
  var nao = NutationAndObliquity(time)
  var nutation = nao.nutation;
  var obliquity = nao.obliquity;
  var apparent_longitude = true_longitude + nutation;
  var longitude = apparent_longitude;

  var ra = Math.atan2(Math.sin(longitude*RadPerDeg)*Math.cos(obliquity*RadPerDeg)-Math.tan(latitude*RadPerDeg)*Math.sin(obliquity*RadPerDeg),Math.cos(longitude*RadPerDeg))/RadPerDeg;
  ra = round_angle(ra);
  var dec = Math.asin(Math.sin(latitude*RadPerDeg)*Math.cos(obliquity*RadPerDeg) + Math.cos(latitude*RadPerDeg)*Math.sin(obliquity*RadPerDeg)*Math.sin(longitude*RadPerDeg))/RadPerDeg;

  //rectanger
  var x = distance*Math.cos(latitude*RadPerDeg)*Math.cos(longitude*RadPerDeg);
  var y = distance*Math.cos(latitude*RadPerDeg)*Math.sin(longitude*RadPerDeg);
  var z = distance*Math.sin(latitude*RadPerDeg);

  var p = {
    x:x,
    y:y,
    z:z
  }

  // equatiorial horizontal parallax
  var parallax = Math.asin(6378140/distance)/RadPerDeg

  return {
    time : time,
    position: {
      equatorial: {
        ra:ra,
        dec:dec,
        distance:distance,
        parallax:parallax
      },
      ecliptic: {
        center:"Earth",
        x:p.x,
        y:p.y,
        z:p.z
      }
    },        
    phase : function(){
      var now = time.date;
      var jd = time.julianDate;
      var date_first = new Date(time.year, 0, 1, 0, 0, 0);
      var date_last = new Date(time.year, 11, 31, 11, 59, 59, 999);
      var since_new_year = (now.getTime() - date_first.getTime())/(date_last.getTime()-date_first.getTime());
      var y = time.year+since_new_year;

      var k = Math.floor((y-2000) * 12.3685);
      var t = k/1236.85;
      var t2 = t*t;
      var t3 = t*t*t;
      var t4 = t*t*t*t;
      var jde0 = 2451550.09766 + 29.530588861*k + 0.00015437*t2 - 0.000000150*t3 + 0.00000000073*t4;

      var e = 1-0.002516*t - 0.0000074*t2;
      e = round_angle(e);
      //Sun's mean anomary at the time;
      var m0 = 2.5534 + 29.10535670*k - 0.0000014*t2 - 0.00000011*t3;
      m0 = round_angle(m0);
      //Moon's mean anomary at the time;
      var m1 = 201.5643 + 385.81693528*k + 0.0107582*t2 + 0.00001238*t3 - 0.000000011*t4; 
      m1 = round_angle(m1);
      //Moon's argument of latitude
      var f = 160.7108 + 390.67050284*k - 0.0016118*t2-0.00000227*t3 + 0.000000011*t4;
      f = round_angle(f);
      //Longitude of the ascending node of lunar orbit
      var omega = 124.7746 -  1.56375588*k + 0.0020672*t2 + 0.00000215*t3;
      omega = round_angle(omega);

      var c1 = 0;
      c1 = c1 - 0.40720 * Math.sin(m1*RadPerDeg);
      c1 = c1 + 0.17241 * e * Math.sin(m0*RadPerDeg);
      c1 = c1 + 0.01608 * Math.sin(2*m1*RadPerDeg);
      c1 = c1 + 0.01039 * Math.sin(2*f*RadPerDeg);
      c1 = c1 + 0.00739 * e * Math.sin((m1-m0)*RadPerDeg);
      c1 = c1 - 0.00514 * e * Math.sin((m1+m0)*RadPerDeg);
      c1 = c1 + 0.00208 * e * e * Math.sin(2*m0*RadPerDeg); 
      c1 = c1 - 0.00111 * Math.sin((m1-2*f)*RadPerDeg)
      c1 = c1 - 0.00057 * Math.sin((m1+2*f)*RadPerDeg)
      c1 = c1 + 0.00056 * e * Math.sin((2*m1+m0)*RadPerDeg);
      c1 = c1 - 0.00042 * Math.sin(3*m1*RadPerDeg);
      c1 = c1 + 0.00042 * e * Math.sin((m0+2*f)*RadPerDeg)
      c1 = c1 + 0.00038 * e * Math.sin((m0-2*f)*RadPerDeg)
      c1 = c1 - 0.00024 * e * Math.sin((2*m1-m0)*RadPerDeg);
      c1 = c1 - 0.00017 * Math.sin(omega*RadPerDeg);
      c1 = c1 - 0.00007 * Math.sin((m1+2*m0)*RadPerDeg);
      c1 = c1 + 0.00004 * Math.sin((2*m1-2*f)*RadPerDeg);
      c1 = c1 + 0.00004 * Math.sin(3*m0 *RadPerDeg);
      c1 = c1 + 0.00003 * Math.sin((m1+m0-2*f)*RadPerDeg);
      c1 = c1 + 0.00003 * Math.sin((2*m1+2*f)*RadPerDeg);
      c1 = c1 - 0.00003 * Math.sin((m1+m0+2*f)*RadPerDeg);
      c1 = c1 + 0.00003 * Math.sin((m1-m0+2*f)*RadPerDeg);
      c1 = c1 - 0.00002 * Math.sin((m1-m0-2*f)*RadPerDeg);
      c1 = c1 - 0.00002 * Math.sin((3*m1+m0)*RadPerDeg);
      c1 = c1 + 0.00002 * Math.sin(4*m1*RadPerDeg);

      var a1 = 299.77 + 0.107408*k-0.009173*t2;
      var a2 = 251.88 + 0.016321*k;
      var a3 = 251.83 + 26.651886*k;
      var a4 = 349.42 + 36.412478 *k; 
      var a5 =  84.66 + 18.206239*k;
      var a6 =  141.74+53.303771*k;
      var a7 =  207.14+2.453732*k;
      var a8 =  154.84+7.306860*k;
      var a9 =  34.52+27.261239*k;
      var a10 =  207.19+0.121824*k;
      var a11 =  291.34+1.844379*k;
      var a12 =  161.72+24.198154*k;
      var a13 =  239.56+25.513099*k;
      var a14 =  331.55+3.592518*k;

      var c2 = 0;
      c2 = c2 + 0.000325 *Math.sin(a1*RadPerDeg);
      c2 = c2 + 0.000165 *Math.sin(a2*RadPerDeg);
      c2 = c2 + 0.000164 *Math.sin(a3*RadPerDeg);
      c2 = c2 + 0.000126 *Math.sin(a4*RadPerDeg);
      c2 = c2 + 0.000110 *Math.sin(a5*RadPerDeg);
      c2 = c2 + 0.000062 *Math.sin(a6*RadPerDeg);
      c2 = c2 + 0.000060 *Math.sin(a7*RadPerDeg);
      c2 = c2 + 0.000056 *Math.sin(a8*RadPerDeg);
      c2 = c2 + 0.000047 *Math.sin(a9*RadPerDeg);
      c2 = c2 + 0.000042 *Math.sin(a10*RadPerDeg);
      c2 = c2 + 0.000040 *Math.sin(a11*RadPerDeg);
      c2 = c2 + 0.000037 *Math.sin(a12*RadPerDeg);
      c2 = c2 + 0.000035 *Math.sin(a13*RadPerDeg);
      c2 = c2 + 0.000023 *Math.sin(a14*RadPerDeg);
      var jde = jde0 + c1 + c2;
      var phase_of_the_moon = jd - jde;
      return phase_of_the_moon;
    }
  } //end  return;
} // end moon position
// Earth data for reference       "orbital_period":"365.256363004",   "radius":"6371.0", "mass":"5.9736E+24"
export class TimeAndEarthPosition {
  time:AstroTime|null = null;
  position:quatvec.Vec| null = null;
}
export class SolarSystemValues {
  ra?:number;
  dec?:number;
  distance?:number;
  phase?:number;
  mag?:number;
  coords:any = null;
  npcoords:any = null;
  nprotateBy:any = null;
  npsunlightdirection:any = null;
  scaledRadius?:number;
  scaledDistance?:number;

}
export function EarthPositionAtTime(t:AstroTime) {
  let p = new TimeAndEarthPosition();
  p.time = t;
  p.position = EarthPosition(t);
  return p;
}
export class SolarSystemObject {
  bf:string = "";
  proper:string = "";
  spect:string = "";
  ci:string = "";
  con:string = "";
  lum:string = "";
  k:number = 0;
  color?:Array<number>;
  radius:number = 0;
  mass:number = 0;
  orbital_period?:number = 0;
  orbitData:any;
  baseMag:number=0;
  rotateDaily:number = 0;
  axis:any;

  calculateMagnitude(phaseAngle:number,r_mag_factor:number,delta_mag_factor:number,distance_mag_factor:number):number{
    return this.baseMag + distance_mag_factor;
  }
  calculate(t:TimeAndEarthPosition,lat:number,lng:number,auScaling:number){
    let eclipticPosition = PlanetPositionEcliptic(t.time as AstroTime,this.orbitData);
    let equatorial = EclipticToEquatorial(eclipticPosition,(t.position as quatvec.Vec));
    let phaseAngle= litPointRotationCalc((t.position as quatvec.Vec),equatorial).phase;
    let auFromObs = quatvec.vlength(equatorial)/metersPerAu;
    let auFromSun = quatvec.vlength(eclipticPosition)/metersPerAu;
    let r_mag_factor = 5.0 * Math.log10(auFromSun);
    let delta_mag_factor = 5.0 * Math.log10(auFromObs);
    let distance_mag_factor = r_mag_factor+delta_mag_factor;
    
    let mag:number = this.calculateMagnitude(phaseAngle,r_mag_factor,delta_mag_factor,distance_mag_factor);
    let result = new SolarSystemValues();
      result.ra=equatorial.ra,
      result.dec = equatorial.dec,
      result.distance=equatorial.distance,
      result.phase=phaseAngle,
      result.mag=mag,
      result.coords=raDecToAltAzandXYZ(lat,lng,equatorial.ra,equatorial.dec,t.time,equatorial.distance*auScaling,false), 
      result.npcoords=raDecToAltAzandXYZ(90,0,equatorial.ra,equatorial.dec,null,equatorial.distance*auScaling,false),
      result.nprotateBy=0;
      result.scaledRadius = this.radius * auScaling;
      result.scaledDistance = result.distance * auScaling;
    
    return result;
  }
}

export const sun = new SolarSystemObject();
sun.orbital_period = 1;  
sun.radius=696340000;
sun.mass=1.989E30;
sun.bf="Sol";
sun.proper = "Sun";
sun.spect="G2V";
sun.ci="";
sun.con="Sol";
sun.lum= "";
sun.k = 5778;
sun.color = [255,255,255];
sun.baseMag = -22;
sun.calculate = function(t:TimeAndEarthPosition,lat:number,lng:number,auScaling:number) {
  let eclipticPosition = {x:0,y:0,z:0};
  let equatorial = EclipticToEquatorial(eclipticPosition,t.position as quatvec.Vec);
  let result = new SolarSystemValues();
  result.ra=equatorial.ra,
  result.dec = equatorial.dec,
  result.distance=equatorial.distance,
  result.mag=-22,
  result.coords=raDecToAltAzandXYZ(lat,lng,equatorial.ra,equatorial.dec,t.time,equatorial.distance*auScaling,false), 
  result.npcoords=raDecToAltAzandXYZ(90,0,equatorial.ra,equatorial.dec,null,equatorial.distance*auScaling,false),
  result.npsunlightdirection=raDecToAltAzandXYZ(90,0,equatorial.ra,equatorial.dec,null,10,false), 
  result.nprotateBy=0;
  result.scaledRadius = this.radius * auScaling;
  result.scaledDistance = result.distance * auScaling;
  return result;
}

export const mercury = new SolarSystemObject();
mercury.bf="Mercury";
mercury.proper = "Mercury";
mercury.spect="G2V";
mercury.ci="";
mercury.con="Sol";
mercury.lum= "";
mercury.k = 4000;
mercury.color = [255,255,255];
mercury.orbital_period = 87.969, 
mercury.radius = 2439700;
mercury.mass = 3.3022E+23;
mercury.orbitData = mercuryData;
mercury.calculateMagnitude = function(phaseAngle:number,r_mag_factor:number,delta_mag_factor:number,distance_mag_factor:number){
  let phaseAngleFactor = (((((-3.0334e-12 * phaseAngle + 1.6893e-09) * phaseAngle - 3.4265e-07) * phaseAngle + 3.3644e-05) *phaseAngle -1.6336e-03) * phaseAngle + 6.3280e-02) * phaseAngle;
  return -0.613 + distance_mag_factor + phaseAngleFactor;
}
mercury.axis = {ra: 281.01,dec:61.45};
mercury.rotateDaily = 6.14;


export const venus = new SolarSystemObject();
venus.orbital_period= 224.70069;  
venus.radius=6051800;
venus.mass= 4.8685E+24;
venus.calculateMagnitude = function(phaseAngle:number,r_mag_factor:number,delta_mag_factor:number,distance_mag_factor:number){
  let phaseAngleFactor:number;
  if ( phaseAngle < 163.7 ) {
    phaseAngleFactor = -1.044E-03 * phaseAngle + 3.687E-04 * phaseAngle*phaseAngle - 2.814E-06 *  phaseAngle*phaseAngle*phaseAngle + 8.938E-09 * phaseAngle*phaseAngle*phaseAngle*phaseAngle;
  } else {
    phaseAngleFactor = 236.05828 + 4.384 - 2.81914E+00 * phaseAngle + 8.39034E-03 * phaseAngle*phaseAngle;
  }
  return -4.384 + distance_mag_factor + phaseAngleFactor;
} 
venus.bf="Venus";
venus.proper = "Venus";
venus.spect="G2V";
venus.ci="";
venus.con="Sol";
venus.lum= "";
venus.k = 5778;
venus.color = [255,255,255];
venus.axis = {ra: 272.76,dec:67.16};
venus.rotateDaily = -1.48;
venus.orbitData = venusData;

export const mars = new SolarSystemObject();

mars.orbital_period=686.971;
mars.radius=3396200;
mars.mass=6.4185E+23;
mars.orbitData = marsData;
mars.baseMag = -0.367
mars.bf="Mars";
mars.proper = "Mars";
mars.spect="G2V";
mars.ci="";
mars.con="Sol";
mars.lum= "";
mars.k = 2500;
mars.color = [255,200,200];
mars.axis = {ra: 317.67,dec:52.88};
mars.rotateDaily = 350.89;



export const jupiter = new SolarSystemObject();
jupiter.orbital_period=4331.572;
jupiter.radius=71492000;
jupiter.mass=1.8986E+27;
jupiter.baseMag = -9.428;
jupiter.bf="Jupiter";
jupiter.proper = "Jupiter";
jupiter.spect="G2V";
jupiter.ci="";
jupiter.con="Sol";
jupiter.lum= "";
jupiter.k = 5778;
jupiter.color = [255,255,255];
jupiter.axis = {ra: 268.06,dec:64.5};
jupiter.rotateDaily = 870.54;
jupiter.orbitData = jupiterData;
export const saturn = new SolarSystemObject();
saturn.orbital_period=10759.22; 
saturn.radius=60268000;
saturn.mass=5.6846E+26;
saturn.baseMag = -8.9;
saturn.bf="Saturn";
saturn.proper = "Saturn";
saturn.spect="G2V";
saturn.ci="";
saturn.con="Sol";
saturn.lum= "";
saturn.k = 5600;
saturn.color = [255,255,200];
saturn.axis = {ra: 40.6,dec:83.54};
saturn.rotateDaily = 810.79;
saturn.orbitData = saturnData;

export const uranus = new SolarSystemObject();
uranus.orbital_period=30799.095;  
uranus.radius=25559000;
uranus.mass=8.6810E+25;
uranus.baseMag = -7.1;
uranus.bf="Uranus";
uranus.proper = "Uranus";
uranus.spect="G2V";
uranus.ci="";
uranus.con="Sol";
uranus.lum= "";
uranus.k = 5600;
uranus.color = [200,255,200];
uranus.axis = {ra: 257.31,dec:-15.18};
uranus.rotateDaily = -501.16;
uranus.orbitData = uranusData;

export const neptune = new SolarSystemObject();
neptune.orbital_period=60190;  
neptune.radius=24764000;
neptune.mass=1.0243E+26;
neptune.baseMag = -7.0;
neptune.bf="Neptune";
neptune.proper = "Neptune";
neptune.spect="G2V";
neptune.ci="";
neptune.con="Sol";
neptune.lum= "";
neptune.k = 10000;
neptune.color = [200,255,255];
neptune.axis = {ra: 299.4,dec:42.95};
neptune.rotateDaily = 536.31;
neptune.orbitData = neptuneData;

export const moon = new SolarSystemObject();

moon.bf="Luna";
moon.proper = "Moon";
moon.baseMag=-100;
moon.spect="G2V";
moon.ci="";
moon.con="Sol";
moon.lum= "";
moon.radius = 1737100;
moon.k = 5778;
moon.color = [255,255,255];
moon.calculate = function(t:TimeAndEarthPosition,lat:number,lng:number,auScaling:number):SolarSystemValues{
// This function also calculates how much to rotate the moon's disk by in order to take into account the inclination of its orbit to 
// the celestial equator. Note that this has nothing to do with the typically much larger rotation which occurs as a result of the inclination
// of the celestial equator to the horizon.
//
// We move the moon a small distance along its orbit, and calculate the angle of that movement vs the moon's equator.
// It's not a perfect calculation, but it's close enough until we find something better
  let moonPosNow = MoonPosition(t.time as AstroTime);
  let eclipticPosition = moonPosNow.position.ecliptic;
  let equatorial = moonPosNow.position.equatorial;
  let phaseAngle = ((29.53059 + moonPosNow.phase()) / 29.53059) % 1 ;
  let moonPosSoon = MoonPosition(new AstroTime(new Date((t.time as AstroTime).date.getTime()+3600*1000)));
  let equatorialSoon = moonPosSoon.position.equatorial;
  let npcoords = raDecToAltAzandXYZ(90,0,equatorial.ra,equatorial.dec,null,equatorial.distance*auScaling,false);
  let futnpcoords = raDecToAltAzandXYZ(90,0,equatorialSoon.ra,equatorialSoon.dec,null,equatorialSoon.distance*auScaling,false);
  let p = npcoords.alt - futnpcoords.alt;
  let q = (npcoords.az - futnpcoords.az) * Math.cos(npcoords.alt/DegsPerRad);
  let nprotateBy = Math.atan2(p,q) * DegsPerRad;
  let result = new SolarSystemValues();
  result.ra=equatorial.ra,
  result.dec = equatorial.dec,
  result.distance=equatorial.distance,
  result.phase=phaseAngle,
  result.mag=-10,
  result.coords=raDecToAltAzandXYZ(lat,lng,equatorial.ra,equatorial.dec,t.time as AstroTime,equatorial.distance*auScaling,false), 
  result.npcoords=raDecToAltAzandXYZ(90,0,equatorial.ra,equatorial.dec,null,equatorial.distance*auScaling,false),
  result.nprotateBy=nprotateBy;
  result.scaledRadius = this.radius * auScaling;
  result.scaledDistance = result.distance * auScaling;
  return result;
}
moon.axis = {ra: 270,dec:66.54};
moon.rotateDaily = 13.17635576160556;
export interface SolarSystemResultItem {
  body:SolarSystemObject,values:SolarSystemValues
}
export interface SolarSystemResult {
  [propName:string]: SolarSystemResultItem
}
export const SolarSystem = [sun,mercury,venus,moon,mars,jupiter,saturn,uranus,neptune ];
export const calcSolarSystem = function(lat:number,lng:number,timeAt:AstroTime,auScaling:number) {
  let result:SolarSystemResult = {};
  let t:TimeAndEarthPosition = EarthPositionAtTime(timeAt);
  SolarSystem.forEach(     
    (p)=>{
      result[p.bf] = ({body:p,values:p.calculate(t,lat,lng,auScaling)})
    }
  );
  return result;
}
// Return the solar system object nearest the raycaster pointer
export const nearestSolarSystem = function(solarResults:any,latitude:number,longitude:number,x:number,y:number,z:number,timeAt:AstroTime, maxMag:number) {
  let radec = XYZToRaDec(latitude,longitude,x,y,z,timeAt);
  let closestIndex = -1;
  let closestDistance = 1000000;
  let wantedSolar:any = null;
  Object.keys(solarResults).forEach(
    (k)=>{
      let theSolar = solarResults[k];
      let mag = theSolar.values.mag;
      if (mag <= maxMag) {
        let starRa = theSolar.values.ra;
        let raDiff = (starRa - radec.ra)
        let starDec = theSolar.values.dec;
        let decDiff = (starDec - radec.dec);
        let thisDiff = raDiff*raDiff + decDiff*decDiff;  // not really the global distance but fine
        if ( thisDiff < closestDistance ) {
          closestDistance = thisDiff;
          wantedSolar = theSolar;
        }
      }
    }
  );
let result = { name: wantedSolar.body.bf,ra:wantedSolar.values.ra,dec:wantedSolar.values.dec,distance:closestDistance,mag: wantedSolar.values.mag};
return result;
}