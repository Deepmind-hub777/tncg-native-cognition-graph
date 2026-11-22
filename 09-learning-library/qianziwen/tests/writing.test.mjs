import test from 'node:test';
import assert from 'node:assert/strict';
import { clientToViewBox, redrawStrokes, createWritingSurface } from '../src/writing.js';

class FakeCanvas {
  width=100; height=100; style={}; clientWidth=200; clientHeight=100; listeners={}; calls=[]; captured=[];
  getBoundingClientRect(){ return {left:10,top:20,width:200,height:100}; }
  getContext(){ const self=this; return { setTransform(...a){self.calls.push(['transform',...a]);}, clearRect(...a){self.calls.push(['clear',...a]);}, beginPath(){}, moveTo(...a){self.calls.push(['move',...a]);}, lineTo(...a){self.calls.push(['line',...a]);}, stroke(){self.calls.push(['stroke']);}, arc(){}, set lineWidth(v){}, set lineCap(v){}, set lineJoin(v){}, set strokeStyle(v){} }; }
  addEventListener(type,fn){this.listeners[type]=fn;}
  removeEventListener(){}
  setPointerCapture(id){this.captured.push(id);}
  releasePointerCapture(){}
}
class FakeSvg { constructor(){this.innerHTML='';this.style={};} }
function fixture(){const canvas=new FakeCanvas(),svg=new FakeSvg();return {canvas,svg,root:{querySelector(s){return s==='canvas'?canvas:svg;},classList:{toggle(){}}},doc:{createElementNS(){return {setAttribute(){}}}},win:{devicePixelRatio:2,addEventListener(){},removeEventListener(){}}};}

test('client coordinates map through the actual element box into shared logical viewBox', () => {
  assert.deepEqual(clientToViewBox(110,70,{left:10,top:20,width:200,height:100},{x:0,y:0,width:1024,height:1024}),{x:512,y:512});
});
test('redraw applies DPR transform and preserves separate vector strokes', () => {
  const calls=[]; const ctx={setTransform(...x){calls.push(['transform',...x]);},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){calls.push(['stroke']);}};
  redrawStrokes(ctx,[[{x:0,y:0},{x:1,y:1}],[{x:2,y:2},{x:3,y:3}]],2,{width:400,height:400});
  assert.deepEqual(calls.filter(x=>x[0]==='stroke').length,2);
  assert.deepEqual(calls[0],['transform',2*400/1024,0,0,2*400/1024,0,0]);
  assert.ok(Math.abs(ctx.lineWidth * (2*400/1024) - 14) < 1e-9, 'brush should remain 7 CSS px at DPR 2');
});
test('pointer capture separates strokes; writing mode controls the guide and clear removes marks', () => {
  const {canvas,svg,root,doc,win}=fixture();
  const c=createWritingSurface({root,character:'天',strokeData:{strokes:['M 1 1L 2 2'],medians:[[[0,0],[100,100]]]},mode:'trace',document:doc,window:win});
  canvas.listeners.pointerdown({pointerId:7,clientX:10,clientY:20,preventDefault(){}});
  canvas.listeners.pointermove({pointerId:7,clientX:110,clientY:70,preventDefault(){}});
  canvas.listeners.pointerup({pointerId:7});
  canvas.listeners.pointerdown({pointerId:7,clientX:110,clientY:70,preventDefault(){}});
  canvas.listeners.pointercancel({pointerId:7});
  assert.equal(canvas.captured[0],7);
  assert.equal(c.strokes.length,2);
  assert.equal(c.strokes[0].length,2);
  c.setMode('free'); assert.equal(svg.style.visibility,'hidden');
  c.setMode('trace'); assert.equal(svg.style.visibility,'visible');
  c.clear(); assert.equal(c.strokes.length,0); c.destroy();
});
