(function(root){
  var EXP=new Array(512),LOG=new Array(256);
  (function(){var x=1;for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(var j=255;j<512;j++)EXP[j]=EXP[j-255]})();
  function gmul(a,b){return a&&b?EXP[LOG[a]+LOG[b]]:0}
  function rsGen(n){var g=[1];for(var i=0;i<n;i++){var ng=new Array(g.length+1);for(var k=0;k<ng.length;k++)ng[k]=0;for(var j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=gmul(g[j],EXP[i])}g=ng}return g}
  function rsEnc(data,n){var g=rsGen(n),res=[];for(var i=0;i<n;i++)res.push(0);for(var k=0;k<data.length;k++){var f=data[k]^res[0];res.shift();res.push(0);for(var j=0;j<n;j++)res[j]^=gmul(g[j+1],f)}return res}
  var ECB={
    L:[null,[7,1,19,0,0],[10,1,34,0,0],[15,1,55,0,0],[20,1,80,0,0],[26,1,108,0,0],[18,2,68,0,0],[20,2,78,0,0],[24,2,97,0,0],[30,2,116,0,0],[18,2,68,2,69],[20,4,81,0,0],[24,2,92,2,93],[26,4,107,0,0],[30,3,115,1,116],[22,5,87,1,88],[24,5,98,1,99],[28,1,107,5,108],[30,5,120,1,121],[28,3,113,4,114],[28,3,107,5,108]],
    M:[null,[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],[16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44],[30,1,50,4,51],[22,6,36,2,37],[22,8,37,1,38],[24,4,40,5,41],[24,5,41,5,42],[28,7,45,3,46],[28,10,46,1,47],[26,9,43,4,44],[26,3,44,11,45],[26,3,41,13,42]]
  };
  var ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90]];
  function utf8(s){var o=[];s=unescape(encodeURIComponent(s));for(var i=0;i<s.length;i++)o.push(s.charCodeAt(i));return o}
  function dataCw(v,e){var q=ECB[e][v];return q[1]*q[2]+q[3]*q[4]}
  function pickVersion(len,ecc){for(var v=1;v<=20;v++){var cb=v<10?8:16,bits=4+cb+8*len;if(bits<=dataCw(v,ecc)*8)return v}throw new Error('QR: data too long')}
  function makeCodewords(bytes,v,ecc){
    var bits=[];function put(val,n){for(var i=n-1;i>=0;i--)bits.push((val>>>i)&1)}
    put(4,4);put(bytes.length,v<10?8:16);for(var i=0;i<bytes.length;i++)put(bytes[i],8);
    var cap=dataCw(v,ecc)*8;for(var t=0;t<4&&bits.length<cap;t++)bits.push(0);while(bits.length%8)bits.push(0);
    var cw=[];for(var k=0;k<bits.length;k+=8){var b=0;for(var j=0;j<8;j++)b=(b<<1)|bits[k+j];cw.push(b)}
    var pad=[0xEC,0x11],pi=0;while(cw.length<cap/8)cw.push(pad[pi++%2]);
    var e=ECB[ecc][v],blocks=[],pos=0;
    for(var g=0;g<2;g++){var cnt=g?e[3]:e[1],dl=g?e[4]:e[2];for(var q=0;q<cnt;q++){blocks.push({d:cw.slice(pos,pos+dl)});pos+=dl}}
    blocks.forEach(function(bl){bl.e=rsEnc(bl.d,e[0])});
    var out=[],maxd=Math.max(e[2],e[4]);
    for(var x=0;x<maxd;x++)blocks.forEach(function(bl){if(x<bl.d.length)out.push(bl.d[x])});
    for(var y=0;y<e[0];y++)blocks.forEach(function(bl){out.push(bl.e[y])});
    var all=[];out.forEach(function(c){for(var i=7;i>=0;i--)all.push((c>>>i)&1)});return all;
  }
  function build(v,ecc,bits,mask){
    var size=17+4*v,m=[],fn=[],r,c;
    for(r=0;r<size;r++){m.push([]);fn.push([]);for(c=0;c<size;c++){m[r].push(0);fn[r].push(false)}}
    function set(x,y,val){m[y][x]=val?1:0;fn[y][x]=true}
    function finder(cx,cy){for(var dy=-4;dy<=4;dy++)for(var dx=-4;dx<=4;dx++){var x=cx+dx,y=cy+dy;if(x<0||y<0||x>=size||y>=size)continue;var d=Math.max(Math.abs(dx),Math.abs(dy));set(x,y,d!==2&&d!==4)}}
    for(var i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
    finder(3,3);finder(size-4,3);finder(3,size-4);
    var ap=ALIGN[v],last=ap.length-1;
    for(var a=0;a<ap.length;a++)for(var b=0;b<ap.length;b++){if((a===0&&b===0)||(a===0&&b===last)||(a===last&&b===0))continue;for(var dy=-2;dy<=2;dy++)for(var dx=-2;dx<=2;dx++)set(ap[a]+dx,ap[b]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}
    function fmt(msk){
      var data=((ecc==='L'?1:0)<<3)|msk,rem=data;for(var i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);
      var f=((data<<10)|rem)^0x5412;function gb(i){return((f>>>i)&1)!==0}
      for(var i2=0;i2<=5;i2++)set(8,i2,gb(i2));set(8,7,gb(6));set(8,8,gb(7));set(7,8,gb(8));
      for(var i3=9;i3<15;i3++)set(14-i3,8,gb(i3));for(var i4=0;i4<8;i4++)set(size-1-i4,8,gb(i4));for(var i5=8;i5<15;i5++)set(8,size-15+i5,gb(i5));set(8,size-8,true);
    }
    fmt(0);
    if(v>=7){var rem=v;for(var i6=0;i6<12;i6++)rem=(rem<<1)^((rem>>>11)*0x1F25);var vb=(v<<12)|rem;for(var i7=0;i7<18;i7++){var col=((vb>>>i7)&1)!==0,aa=size-11+i7%3,bb=Math.floor(i7/3);set(aa,bb,col);set(bb,aa,col)}}
    var bi=0,up=true;
    for(var cx=size-1;cx>0;cx-=2){if(cx===6)cx--;for(var k=0;k<size;k++){var y=up?size-1-k:k;for(var d=0;d<2;d++){var x=cx-d;if(!fn[y][x]){m[y][x]=bi<bits.length?bits[bi++]:0}}}up=!up}
    function cond(msk,y,x){switch(msk){case 0:return(x+y)%2===0;case 1:return y%2===0;case 2:return x%3===0;case 3:return(x+y)%3===0;case 4:return(Math.floor(y/2)+Math.floor(x/3))%2===0;case 5:return(x*y)%2+(x*y)%3===0;case 6:return((x*y)%2+(x*y)%3)%2===0;default:return((x+y)%2+(x*y)%3)%2===0}}
    for(var yy=0;yy<size;yy++)for(var xx=0;xx<size;xx++)if(!fn[yy][xx]&&cond(mask,yy,xx))m[yy][xx]^=1;
    fmt(mask);return {size:size,m:m};
  }
  function penalty(o){var m=o.m,n=o.size,p=0,x,y,run,dark=0;
    for(y=0;y<n;y++){run=1;for(x=1;x<n;x++){if(m[y][x]===m[y][x-1])run++;else{if(run>=5)p+=run-2;run=1}}if(run>=5)p+=run-2}
    for(x=0;x<n;x++){run=1;for(y=1;y<n;y++){if(m[y][x]===m[y-1][x])run++;else{if(run>=5)p+=run-2;run=1}}if(run>=5)p+=run-2}
    for(y=0;y<n-1;y++)for(x=0;x<n-1;x++){var s=m[y][x];if(s===m[y][x+1]&&s===m[y+1][x]&&s===m[y+1][x+1])p+=3}
    for(y=0;y<n;y++)for(x=0;x<n;x++)if(m[y][x])dark++;
    p+=Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10;return p}
  function make(text,ecc){ecc=ecc==='M'?'M':'L';var bytes=utf8(String(text)),v=pickVersion(bytes.length,ecc),bits=makeCodewords(bytes,v,ecc),best=null,bp=1e9;
    for(var mk=0;mk<8;mk++){var o=build(v,ecc,bits,mk),pp=penalty(o);if(pp<bp){bp=pp;best=o}}best.version=v;best.get=function(r,c){return !!best.m[r][c]};return best}
  function draw(ctx,q,x,y,px,quiet,dark,light){var n=q.size,tot=(n+quiet*2)*px;ctx.fillStyle=light||'#fff';ctx.fillRect(x,y,tot,tot);ctx.fillStyle=dark||'#000';for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(q.m[r][c])ctx.fillRect(x+(c+quiet)*px,y+(r+quiet)*px,px,px);return tot}
  root.QR={make:make,draw:draw};
})(typeof window!=='undefined'?window:globalThis);
