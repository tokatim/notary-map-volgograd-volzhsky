(function(root){'use strict';
function inRing(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function inside(p,rings){return inRing(p,rings[0])&&!rings.slice(1).some(r=>inRing(p,r))}
function distanceToRings(p,rings){const sx=111320*Math.cos(p[1]*Math.PI/180),sy=111320;let best=Infinity;for(const ring of rings)for(let i=1;i<ring.length;i++){const x=(ring[i-1][0]-p[0])*sx,y=(ring[i-1][1]-p[1])*sy,dx=(ring[i][0]-ring[i-1][0])*sx,dy=(ring[i][1]-ring[i-1][1])*sy,t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(x+t*dx,y+t*dy))}return best}
function lookup(lon,lat,features){const found=new Set();let edge=Infinity;for(const f of features){const coords=f.geometry.coordinates;if(inside([lon,lat],coords)){found.add(f.properties.section_number);edge=Math.min(edge,distanceToRings([lon,lat],coords))}}return {sections:[...found],nearBoundary:edge<=12}}
root.NotaryGeometry={lookup,inside};if(typeof module!=='undefined')module.exports=root.NotaryGeometry;
})(typeof window!=='undefined'?window:globalThis);
